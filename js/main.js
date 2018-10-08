// ToDo
// 
// help button
// sending/sharing etc
// more themes (like poetry)
// switch font
//
//
//
'use strict';

// too much global variables
var fs = require('fs'),
    gui = require('nw.gui'),
    win = gui.Window.get(),
    clipboard = gui.Clipboard.get(),
    selM = true,
    selH = false,
    M = "M",
    H = "H",
    menuActive = false,
    preview = true,
    edited = false,
    documentPath = 'New Document',
    appName = 'Nota',
    themeName = 'default-sans',
    firstIframeInit = true,
    sleep = true,
    editBIS = false,
    BIS = '',
    // Get the absolute path (absolutepath 2 has slashes in other
    // direction and starts with file:///)
    absolutePath = process.execPath.replace('nw.exe', ''),
    absolutePath = absolutePath.replace('app.exe', ''),
    absolutePath2 = absolutePath.replace(/\\/g, '/'),
    absolutePath = absolutePath.replace('C:\\', 'file:///C:/'),
    absolutePath = absolutePath.replace(/\\/g, '/');

$(document).ready(function () {
    // TESTING
    $(document).bind("keyup", function (e) {
        if (e.ctrlKey && !e.shiftKey && e.keyCode == 112) { // ctrl-f1
            win.reload();
        }
        if (e.ctrlKey && !e.shiftKey && e.keyCode == 113) { // ctrl-f2
            win.showDevTools();
        }
    });

    // show body
    $('.output').load(function(){
        $('body').fadeIn(100);
        editor.refresh();
        editor.focus();
    });

    // img dragging fix
    $('img').on('dragstart', function(event) { event.preventDefault(); });

    // make edit-toolbar draggable
    $('.edit_toolbar').draggable({ 
        containment: "window",
        iframeFix: true
    });

    // toggle line-numbers on f9
    $(document).bind("keyup", function (e) {
        if (e.keyCode == 120) { // f9
            if (editor.getOption('lineNumbers') == false) {
                editor.setOption('lineNumbers', true);
            } else {
                editor.setOption('lineNumbers', false);
            }
        }
    });

    // Because highlight.js is a bit awkward at times
    var languageOverrides = {
      js: 'javascript',
      html: 'xml',
      htmlmixed: 'xml'
    }

    marked.setOptions({
      highlight: function(code, lang){
        if(languageOverrides[lang]) lang = languageOverrides[lang];
        return hljs.LANGUAGES[lang] ? hljs.highlight(lang, code).value : code;
      },
      breaks: true,
      gfm: true
    });

    // # Load and apply settings if set

    // load theme settings
    if (localStorage.theme){
        themeName = localStorage.theme.replace('.css', '');
        console.log(themeName);
    }
    // theme
    $('.output').load(function(){
        if(firstIframeInit == true){
            var themeURL = absolutePath + 'themes/' + themeName + '.css',         
                head = $(".output").contents().find("head");  
            console.log(themeURL);              
            head.append($("<link/>", 
                { class: "theme", rel: "stylesheet", href: themeURL, type: "text/css" }
            ));
            firstIframeInit = false;
        }        
    });

    // show editToolbar
    if (localStorage.showEditToolbar){
        if (localStorage.showEditToolbar == "true") {
            $('.edit_toolbar').show();
            console.log('ed = true');
        } else {            
            console.log('ed = false');
        }
    }

    // Preview toggle
    if (localStorage.preview) {
        if (localStorage.preview == "true") {
            togglePreview(true);
        } else {
            togglePreview(false);
        }
    }
    // font size
    if (localStorage.font) {
        $(".CodeMirror").css("font-size", localStorage.font)
        editor.refresh();
    }
    
    $('title').html(documentPath + ' (' + getTitle() + ') - ' + appName);


    updateCheck();



    // reset image-toolbar on resize fix
    $(window).resize(function(){
        if ($('.edit_toolbar').css('display') != 'none') {
            $('.edit_toolbar').attr('style', '');
            editor.refresh();
        }
    });

    // # Functions

    function updateCheck() {
        if (selM == true) {
            $('.markdown').css('opacity', 0.6);
            $('.html').css('opacity', 0.3);
        }
        if (selH == true) {
            $('.markdown').css('opacity', 0.3);
            $('.html').css('opacity', 0.6);
        }
    }
    function switchSel() {
        selM = !selM;
        selH = !selH;        
        updateCheck();
    }
    function updateHtml() {
        clearTimeout(timeout);
        var pageBreak = "\n<hr class='page-break'>\n";
        var t = insToc(true, editor.getValue()),
            t = t.replace(/^\{Page break\}/mg, pageBreak).replace(/^\{PB\}/mg, pageBreak),
            t = marked(t);
        $('.output').contents().find('.wrapper').html(t);
        $('.output').contents().find('a').each(function( index ) {
            var regex = /\#./;
            if (!regex.test($(this).attr('href'))) {
                $(this).attr('onclick', "alert('You cannot open links in preview.'); win.focus();")
                .attr('title', $(this).attr('href'))
                .attr('href', "#");
            }
            
        });   
        timeout = setTimeout(updateHtml,sleepMS);     
    }
    var timeout;
    var sleepMS = 10000;
    function sel(s) {
        if (s === "M") {
            selM = true;
            selH = false;
        } else {
            selM = false;
            selH = true;
        }
        updateCheck();
    }
    function togglePreview(e) {
        if (!e) {
            preview = !preview;
            if (preview !== true) {
                $('.output').hide();
                $('.markdown').hide();
                $('.html').hide();
                $('.CodeMirror').css('width', '100%');
                $('.CodeMirror').css('right', '0');
                localStorage.preview = "false";
            } else {
                $('.output').show();
                $('.markdown').show();
                $('.html').show();
                $('.CodeMirror').css('width', '50%');
                $('.CodeMirror').css('right', '50%');
                localStorage.preview = "true";
            }
        }
        if (e == true) {
            $('.output').show();
            $('.markdown').show();
            $('.html').show();
            $('.CodeMirror').css('width', '50%');
            $('.CodeMirror').css('right', '50%');
            localStorage.preview = "true";
        }
        if (e == false) {
            $('.output').hide();
            $('.markdown').hide();
            $('.html').hide();
            $('.CodeMirror').css('width', '100%');
            $('.CodeMirror').css('right', '0');
            localStorage.preview = "false";
        }
        editor.refresh();
    }


    // ## Saving, opening and exporting

    function openFile(path) {
        // only utf8 support [issue]
        fs.readFile(path, 'utf8', function (err,data) {
          if (err) {
            alert(err);
          } else {
            // replace BOM
            data = data.replace(/^\uFEFF/, '');
            // load data in codemirror
            editor.setValue(data);
            $('title').html(documentPath + ' (' + getTitle() + ') - ' + appName);
            console.log('New file opened');
            editor.clearHistory();
            edited = false;
          }
          
        });
    }

    // writing of file (save (not export))
    function saveFile(path) {
        fs.writeFile(path, editor.getValue(), function (err) {
                if (err) throw err;
                console.log('saved as ' + documentPath);
                // note document path
                note('Saved as: ' + documentPath);
                // set edited to false
                edited = false;
                // reset title (remove '*')
                $('title').html(documentPath + ' (' + getTitle() + ') - ' + appName);
            });
    }

    // open file dialog
    function chooseFile(name) {
        var chooser = $(name);
        console.log('chooseFile triggered');
            chooser.change(function (evt) {
                if (chooser !== '') {
                    documentPath = $(this).val();
                    openFile(documentPath);                    
                }
                $('#fileDialog').remove();
            })
        

        chooser.trigger('click');        
    }

    // save file dialog
    function chooseSaveFile(name) {
        var chooser = $(name);
        console.log('chooseSaveFile triggered');
            chooser.change(function (evt) {
                if (chooser !== '') {
                    documentPath = $(this).val();
                    $.when ( saveFile(documentPath) ).then(function () {
                        $('title').html(documentPath + ' (' + getTitle() + ') - ' + appName);
                        console.log('File saved');
                        edited = false;
                    });
                    
                }
                $('#fileDialog').remove();
            })
        chooser.trigger('click');        
    }

    // create new blank document
    function newDocument() {
        // clear codemirror content
        editor.setValue('');
        // set documentpath, this get's checked
        // to see if doc is new
        documentPath = "New Document";
        // reset title
        $('title').html(documentPath + ' (' + getTitle() + ') - ' + appName);
        // Prevent title and edited variable update because
        // content codemirror changes
        edited = false;
        // update preview
        updateHtml();
        console.log('newDocument triggered');
        // make sure undo/redo are reset
        editor.clearHistory();
    }

    // confirm New
    function newF() {
        if (edited == true) {
            if (confirm("Are you sure? Unsaved changes will be lost.")) {
                    newDocument();
                    console.log('edited = true, choice = yes');
                } else {
                    console.log('edited = true, choice = no');
                }
        } else {
            newDocument();
            console.log('edited = false, no choice');
        }
        // dialog box will blur window
        win.focus();
        console.log("edited = " + edited);
    }

    // confirm Open
    function openF() {
        $('#fileDialog').remove();
        if (edited == true) {
            if (confirm("Are you sure? Unsaved changes will be lost.")) {
                    // appending html input element, 
                    // this is necessary for chooseFile function
                    $('body').append('<input style="display:none;" id="fileDialog" class="fileDialog" type="file" accept="text/plain, .md, .markdown, .mdown, .markdn" />');
                    chooseFile('#fileDialog');
                }
        } else {
            $('body').append('<input style="display:none;" id="fileDialog" class="fileDialog" type="file" accept="text/plain, .md, .markdown, .mdown, .markdn" />');
            chooseFile('#fileDialog');
        }
        win.focus();
    }
    function saveAsF() {
        $('#saveFileDialog').remove();
        $('body').append('<input style="display:none;" id="saveFileDialog" class="saveFileDialog" type="file" nwsaveas="' + getTitle() + '" accept=".md" />');
        chooseSaveFile('#saveFileDialog');
    }

    // check if document is new document, if so
    // run "save as"  else just save on documentPath
    function saveF() {
        if( documentPath == 'New Document') {
            saveAsF();
        }else{ 
            saveFile(documentPath);
        }
    }

    // export to file
    function exportSave(path, HTML) {
        fs.writeFile(path, HTML, function (err) {
            if (err) throw err;
            console.log('saved as ' + path);
            note('Exported as: ' + path);
        });
    }

    function exportHTML(styles) {
        if (styles == true) {
            var style = fs.readFileSync(absolutePath2 + 'themes/' + themeName + '.css');
            var t = insToc(true, editor.getValue()),
                t = t.replace(/^\{Page break\}/mg, '').replace(/^\{PB\}/mg, ''),
                t = marked(t);
            var HTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + getTitle() + '</title><style>' + style + '</style></head><body><div class="wrapper">' + t + '</div></body></html>';
            $('#saveFileDialog').remove();
            $('body').append('<input style="display:none;" id="saveFileDialog" class="saveFileDialog" type="file" nwsaveas="' + getTitle() + '" accept="text/html" />');
            var chooser = $('#saveFileDialog');
            console.log('chooseSaveFile Export triggered');
                chooser.change(function (evt) {
                    if (chooser !== '') {
                        var savePath = $(this).val();
                        $.when ( exportSave(savePath, HTML)).then(function () {
                            
                            console.log('File exported');
                        });
                        
                    }
                    $('#fileDialog').remove();
                })
            chooser.trigger('click'); 

                  
        } else {
            var t = insToc(true, editor.getValue()),
                t = t.replace(/^\{Page break\}/mg, '').replace(/^\{PB\}/mg, ''),
                t = marked(t);
            var HTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + getTitle() + '</title></head><body>' + t + '</body></html>';
            $('#saveFileDialog').remove();
            $('body').append('<input style="display:none;" id="saveFileDialog" class="saveFileDialog" type="file" nwsaveas="' + getTitle() + '" accept="text/html" />');
            var chooser = $('#saveFileDialog');
            console.log('chooseSaveFile Export triggered');
                chooser.change(function (evt) {
                    if (chooser !== '') {
                        var savePath = $(this).val();
                        $.when ( exportSave(savePath, HTML)).then(function () {
                            
                            console.log('File exported');
                        });
                        
                    }
                    $('#fileDialog').remove();
                })
            chooser.trigger('click'); 
        }
    
    }

    function embedMedia(string, ph) {
        if (ph == true) {
            
        }
    }

    function getTitle() {
        var s = editor.getLine(0);
        if (s === '') {
            return 'Untitled';
        } else {
            s = s.replace(/(\{h\})(.*)(\{\/h\})/gm, '$2').replace(/(\{hidden\})(.*)(\{\/hidden\})/gm, '$2').replace(/[^a-z0-9]/gi, ' ').replace(/\s+/g, ' ').replace(/\s*(.+)\s*/g, '$1');
            if(s.length > 80) s = s.substring(0,80);
            return s;
        }
        
    }

    // make actual edit into it's own function 
    // so it can be called from multiple places
    function edit(type, str1, str2) {
        if (type == "normal") {
            if (editor.somethingSelected() == true) {
                if(str1 == '**' || str1 == '_' || str1 == '~~') {
                    editBIS = false; 
                    var selText = editor.getSelection();
                    if(selText.match(/\*\*.+\*\*/mg) || selText.match(/\_.+\_/mg) || selText.match(/\~\~.+\~\~/mg)) { // is selection already contains [BIS]
                        if (str1 == '**' && selText.match(/.*\*\*.+\*\*.*/mg)) { // if match is the same as str1
                            editor.replaceSelection(selText.replace(/(\*\*)(.+?)(\*\*)/g, '$2')); // remove str1 from string
                        } else if (str1 == '**' && !selText.match(/.*\*\*.+\*\*.*/mg)) { // if match is not the same as str1
                            editor.replaceSelection(str1 + selText + str2); // add str1 to string
                        }
                        if (str1 == '_' && selText.match(/.*\_.+\_.*/mg)) {
                            editor.replaceSelection(selText.replace(/(\_)(.+?)(\_)/g, '$2'));
                        } else if (str1 == '_' && !selText.match(/.*\_.+\_.*/mg)) {
                            editor.replaceSelection(str1 + selText + str2);
                        }
                        if (str1 == '~~' && selText.match(/.*\~\~.+\~\~.*/mg)) {
                            editor.replaceSelection(selText.replace(/(\~\~)(.+?)(\~\~)/g, '$2'));
                        } else if (str1 == '~~' && !selText.match(/.*\~\~.+\~\~.*/mg)) {
                            editor.replaceSelection(str1 + selText + str2);
                        }
                    } else {
                        editor.replaceSelection(str1 + editor.getSelection() + str2);
                    }                    
                    editBIS = true; 
                } else {
                    editor.replaceSelection(str1 + editor.getSelection() + str2, "end"); 
                }                       
            } else {
                editor.operation(function (){
                    editor.replaceSelection(str1, 'end');
                    editor.replaceSelection(str2, 'start');
                });
            }                    
        }
        if (type == "regex") {
            var line = false;
            var bq = editor.getSelection(),
            // possible matches if selected text has list in it
                pb1 = /^\s*\*\s* +/gm,
                pb2 = /^\s*\+\s* +/gm,
                pb3 = /^\s*\-\s* +/gm,
                pb4 = /^\s*\d+\.\s* +/gm;            

            if (bq == '') { // if nothing is selected
                var line = true;
                var obj = editor.getCursor();
                bq = editor.getLine(obj.line); // set string to current line
            }
            if (str1 == "* ") {          
                if (pb1.test(bq) || pb2.test(bq) || pb3.test(bq) || pb4.test(bq)) { // test if string has list in it
                    bq = bq.replace(/(^\s*)(\d+\.)(\s* )+/gm, '$1*$3'); // if so, convert to new list type
                    if (line == true) {
                        editor.setLine(obj.line, bq); // if string was line, set line
                    } else {
                        editor.replaceSelection(bq); // if string was selection, replace slection
                    }                 
                } else {
                    bq = bq.replace(/(^\s*)(.+)+/gm, '$1' + str1 + '$2'); // string has no list, make every line into list item
                    if (line == true) {
                        editor.setLine(obj.line, bq); // if string was line, set line
                        if (bq == '') {
                            editor.replaceSelection(str1, 'end'); // if line was empty, set manually
                        }
                    } else {
                        editor.replaceSelection(bq); // if string was selection, replace slection
                    }   
                }                
            }
            if (str1 == "0. ") {
                if (pb1.test(bq) || pb2.test(bq) || pb3.test(bq) || pb4.test(bq)) {
                    bq = bq.replace(/(^\s*)([\*\-\+])(\s* )+/gm, '$10.$3'); // fancy regex stuff
                    if (line == true) {
                        editor.setLine(obj.line, bq);
                    } else {
                        editor.replaceSelection(bq);
                    } 
                } else {
                    bq = bq.replace(/(^\s*)(.+)+/gm, '$1' + str1 + '$2');
                    if (line == true) {
                        editor.setLine(obj.line, bq);
                        if (bq == '') {
                            editor.replaceSelection(str1, 'end');
                        }
                    } else {
                        editor.replaceSelection(bq);
                    }  
                }
            }  
            if (str1 == "> ") { 
                bq = bq.replace(/(^\s*)(.+)+/gm, '$1' + str1 + '$2');
                if (line == true) {
                    editor.setLine(obj.line, bq);
                    if (bq == '') {
                        editor.replaceSelection(str1, 'end');
                    }
                } else {
                    editor.replaceSelection(bq);
                }  
            }
        }
    }

    // calls correct edit function for certain shortcut
    function scEdit(type, str1, str2, key, shift, e) {
        if (type == "normal") {
            if (shift == true) {
                if (event.ctrlKey && event.shiftKey && e.keyCode == key) {
                    edit('normal', str1, str2);                    
                }
            } else {
                if (event.ctrlKey && !event.shiftKey && e.keyCode == key) {
                    edit('normal', str1, str2);                     
                }
            }            
        }
        if (type == "regex") {
            if (shift == true) {
                if (event.ctrlKey && event.shiftKey && e.keyCode == key) {
                    edit('regex', str1, str2);
                }
            } else {
                if (event.ctrlKey && !event.shiftKey && e.keyCode == key) {
                    edit('regex', str1, str2);
                } 
            }            
        }
    }
    // insert table of contents
    function insToc(a, editorValue) {
        var re = /(^\s*)(\#+\s+.+)/gm,
            s = editor.getValue(),
            m,
            list = '';

        do {
            m = re.exec(s);
            if (m) {
                var count = 0;
                var ind = '';
                var string = m[2];
                for(var i = 0; i < string.length; i++) {
                    string = string.replace(/\s+\#+/g, '');
                    if(string.charAt(i) == '#') {
                        count++;
                        if (i > 0) {
                            ind = ind + ' ';
                        }                            
                    }
                }
                string = string.replace(/\#+\s+/g, '');
                var href = string.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
                    href = href.replace(/\-+/gi, '-').toLowerCase();
                list = list + '\n' + ind + '* [' + string + '](#' + href + ')';
            }
        } while (m);
        if (a == true) {
            return editorValue.replace(/\{h\}.*\{\/h\}/gm, '').replace(/\{hidden\}.*\{\/hidden\}/gm, '').replace(/^\{Table of contents\}/mg, list).replace(/^\{TOC\}/mg, list);
        } else {
            editor.replaceSelection(list + '\n', 'end');
        }
        
    }
    function convertInlineToRef() { // convert all links/images to reference links/images
        var str = editor.getValue(),
            count = 0,
            refs = '\n';

        str = str.replace(/(\[)(.*)(\])(\()(.*)(\))+/gm, function(m){
            console.log(m);
            count = count + 1, count.toString();
            var url = m.replace(/(\[)(.*)(\])(\()(.*)(\))+/gm, '$5');
            refs = refs + '\n[' + 'ref-' + count + ']: ' + url;
            return m.replace(/(\[)(.*)(\])(\()(.*)(\))+/gm, '$1$2$3[' + 'ref-' + count + ']');
        });

        editor.operation(function (){
            editor.setValue(str + refs);
            editor.setCursor(editor.lastLine());
        });
    }
    

    // # General

    $(document).bind("keydown", function (e) { 
        if (event.ctrlKey && e.keyCode == 82) { // trigger inline to ref converter on pressing enter
            convertInlineToRef()
        }
        if (e.keyCode == 32) {
            if (editBIS == true) { // if just changed selection BIS
                editor.replaceSelection(editor.getSelection(), 'end');
                editBIS = false;
            }
        }
    });

    // Prevent window from closing if document is edited
    win.on('close', function() {
        setShowEditToolbar();
        if (edited == true) {
            if (confirm("Are you sure? Unsaved changes will be lost.")) {
                    saveWindowState();
                    this.close(true);
                } else {
                    
                    win.focus();
                }
        } else {
            saveWindowState();
            this.close(true);
        }
    });

    // ## Menu button actions

    // show edit-toolbar
    function setShowEditToolbar() {
        if ($('.edit_toolbar').css('display') == 'none') {
            localStorage.showEditToolbar = "false";
            console.log('showED = false')
        } else {
            localStorage.showEditToolbar = "true";
            console.log('showED = true')
        }
    }
    $(document).bind("keydown", function (e) {
        if (event.ctrlKey && event.shiftKey && e.keyCode == 84) {
            $('.edit_toolbar').toggle('drop', { direction: 'up' }, 60);
        }
    });
    $('.toggle_toolbar').click(function () {
        $('.edit_toolbar').toggle('drop', { direction: 'up' }, 60);
    });
    $('.close').click(function () {
        $('.edit_toolbar').hide('drop', { direction: 'up' }, 60);
    });
    $('.close').bind("contextmenu",function(e){
        $('.edit_toolbar').attr('style', '');
        return false;
    }); 

    //- 
    $('.reference').click(function () {
        convertInlineToRef();
    });
    $('.help').click(function () {
        
    });
    $('.toggle_ln').click(function () {
        if (editor.getOption('lineNumbers') == false) {
                editor.setOption('lineNumbers', true);
            } else {
                editor.setOption('lineNumbers', false);
            }
    });   
    $('.ins_dyntoc').click(function () {
        editor.replaceSelection('{Table of contents}', 'end');
    });
    $('.ins_pb').click(function () {
        editor.replaceSelection('{Page break}', 'end');
    });
    $('.image').click(function () {
        edit('normal', '![', ']()');
    });
    $('.image').bind("contextmenu",function(e){
        edit('normal', '![](', ')');
        return false;
    }); 
    $('.link').click(function () {
        edit('normal', '[', ']()');
    });
    $('.link').bind("contextmenu",function(e){
        edit('normal', '[](', ')');
        return false;
    }); 
    $('.ul').click(function () {
        edit('regex', '* ', 0);
    });
    $('.ol').click(function () {
        edit('regex', '0. ', 0);
    });
    $('.blockquote').click(function () {
        edit('regex', '> ', 0);
    });
    $('.bold').click(function () {
        edit('normal', '**', '**');
    });
    $('.italic').click(function () {
        edit('normal', '_', '_');
    });
    $('.strikethrough').click(function () {
        edit('normal', '~~', '~~');
    });
    $('.code').click(function () {
        edit('normal', '`', '`');
    });
    $('.code').bind("contextmenu",function(e){
        edit('normal', '```\n', '\n```');
        return false;
    }); 
    $('.sup').click(function () {
        edit('normal', '<sup>', '</sup>');
    });
    $('.sub').click(function () {
        edit('normal', '<sub>', '</sub>');
    });

    $('.undo').click(function () {
        editor.undo();
        note('Undo');
    });
    $('.redo').click(function () {
        editor.redo();
        note('Redo');
    });
    $('.copy').click(function () {
        clipboard.set(editor.getSelection(), 'text');
        var count = editor.getSelection().length;
        note('Copied ' + count + ' characters')
    });
    $('.cut').click(function () {
        clipboard.set(editor.getSelection(), 'text');
        var count = editor.getSelection().length;
        note('Cut ' + count + ' characters')
        editor.replaceSelection("");
    });
    $('.paste').click(function () {
        editor.replaceSelection(clipboard.get('text'), "end");
        var count = clipboard.get('text').length;
        note('Pasted ' + count + ' characters')
    });
    $('.paste_link').click(function () {
        edit('normal', '[', '](' + clipboard.get('text') + ')');
    });
    $('.paste').bind("contextmenu",function(e){
        edit('normal', '[', '](' + clipboard.get('text') + ')');
        return false;
    }); 
    $('.switch_focus').click(function () {
        switchSel();
    });
    $('.select_all').click(function () {
        editor.execCommand("selectAll");
    });
    $('.toggle_preview').click(function () {
        if (editor.getOption('fullScreen') == false) {
            togglePreview();
        }
    });
    $('.font_smaller').click(function () {
        var fontSize = parseInt($(".CodeMirror").css("font-size"));
        fontSize = fontSize - 1 + "px";
        $(".CodeMirror").css("font-size", fontSize);
        editor.refresh();
        localStorage.font = fontSize;
        note('Font size: ' + fontSize);
    });
    $('.font_larger').click(function () {
        var fontSize = parseInt($(".CodeMirror").css("font-size"));
        fontSize = fontSize + 1 + "px";
        $(".CodeMirror").css("font-size", fontSize);
        editor.refresh();
        localStorage.font = fontSize;
        note('Font size: ' + fontSize);
    });
    $('.font_reset').click(function () {
        $(".CodeMirror").css("font-size", '15px');
        editor.refresh();
        localStorage.font = "";
        note('Font size: 15px');
    });


    $(document).bind("keyup", function (e) {
        if (event.ctrlKey && !event.shiftKey && e.keyCode == 79) { // ctrl-o
            openF();
        }
        if (event.ctrlKey && !event.shiftKey && e.keyCode == 78) { // ctrl-n
            newF();
        }
        if (event.ctrlKey && !event.shiftKey && e.keyCode == 83) { // ctrl-s
            saveF();
        }
        if (event.ctrlKey && event.shiftKey && e.keyCode == 83) { // ctrl-shift-s
            saveAsF();
        }
    });
    $('.new').click(function () {  
        newF();
    });
    $('.save').click(function() {
        saveF();
    });
    $('.save_as').click(function() {
        saveAsF();
    });
    $('.open').click(function () {
        openF();
    });



    // output html copying and exporting
    $('.copy_output').click(function() {
        var t = insToc(true, editor.getValue()),
            t = t.replace(/^\{Page break\}/mg, '').replace(/^\{PB\}/mg, ''),
            t = marked(t);
        clipboard.set(t, 'text');
        note('Copied output HTML to clipboard.');
    });
    $('.copy_output_styles').click(function() {
        var t = insToc(true, editor.getValue()),
            t = t.replace(/^\{Page break\}/mg, '').replace(/^\{PB\}/mg, ''),
            t = marked(t);
        var style = fs.readFileSync(absolutePath2 + 'themes/' + themeName + '.css');
        var HTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + getTitle() + '</title><style>' + style + '</style></head><body><div class="wrapper">' + t + '</div></body></html>';
        clipboard.set(HTML, 'text');
        note('Copied output HTML with stylesheet to clipboard.');
    });
    $('.quick_copy').click(function(evt) {
        if (!evt.shiftKey) { // no shift
            var t = insToc(true, editor.getValue()),
                t = t.replace(/^\{Page break\}/mg, '').replace(/^\{PB\}/mg, ''),
            t = marked(t);
            clipboard.set(t, 'text');
            note('Copied output HTML to clipboard.');
        }
        if (evt.shiftKey) { // shift key pressed
            var t = insToc(true, editor.getValue()),
                t = t.replace(/^\{Page break\}/mg, '').replace(/^\{PB\}/mg, ''),
            t = marked(t);
            var style = fs.readFileSync(absolutePath2 + 'themes/' + themeName + '.css');
            var HTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + getTitle() + '</title><style>' + style + '</style></head><body><div class="wrapper">' + t + '</div></body></html>';
            clipboard.set(HTML, 'text');
            note('Copied output HTML with stylesheet to clipboard.');
        }
    });
    $('.quick_copy').bind("contextmenu",function(e){
        var t = insToc(true, editor.getValue()),
                t = t.replace(/^\{Page break\}/mg, '').replace(/^\{PB\}/mg, ''),
            t = marked(t);
        var style = fs.readFileSync(absolutePath2 + 'themes/' + themeName + '.css');
        var HTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + getTitle() + '</title><style>' + style + '</style></head><body><div class="wrapper">' + t + '</div></body></html>';
        clipboard.set(HTML, 'text');
        note('Copied output HTML with stylesheet to clipboard.');
        return false;
    }); 
    $(document).bind("keydown", function (e) {
        if (event.ctrlKey && event.shiftKey && e.keyCode == 75) { // ctrl-shift-k
            var t = insToc(true, editor.getValue()),
                t = t.replace(/^\{Page break\}/mg, '').replace(/^\{PB\}/mg, ''),
            t = marked(t);
            var style = fs.readFileSync(absolutePath2 + 'themes/' + themeName + '.css');
            var HTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + getTitle() + '</title><style>' + style + '</style></head><body><div class="wrapper">' + t + '</div></body></html>';
            clipboard.set(HTML, 'text');
            note('Copied output HTML with stylesheet to clipboard.');
        }
        if (event.ctrlKey && event.shiftKey && e.keyCode == 67) { // ctrl-shift-c
            var t = insToc(true, editor.getValue()),
                t = t.replace(/^\{Page break\}/mg, '').replace(/^\{PB\}/mg, ''),
            t = marked(t);
            clipboard.set(t, 'text');
            note('Copied output HTML to clipboard.');
        }
        if (event.ctrlKey && event.shiftKey && e.keyCode == 69) { // ctrl-shift-e
            exportHTML(true);
        }
        if (event.ctrlKey && !event.shiftKey && e.keyCode == 69) { // ctrl-e
            exportHTML(false);
        }
    });
    $('.export_styles').click(function() {
        exportHTML(true);
    });
    $(".quick_export").click(function(evt) {
        if (!evt.shiftKey) { // no shift
            exportHTML(false);
        }
        if (evt.shiftKey) { // shift
            exportHTML(true);
        }
    });
    $('.quick_export').bind("contextmenu",function(e){ // left click
        exportHTML(true);
        return false;
    }); 
    $('.export').click(function() {
        exportHTML(false);
    });

    // automatic table of contents
    $('.ins_toc').click(function() {
        insToc(false, 0);
    });
    $(document).bind("keydown", function (e) {
        if (event.ctrlKey && event.shiftKey && e.keyCode == 79) {
            insToc(false, 0);
        }
    });


    // fullscreen
    $(".toggle_fullscreen").click(function(evt) {
        win.toggleFullscreen();
    });
    $(document).bind("keydown", function (e) {
        if (e.keyCode == 122) { // F11
            win.toggleFullscreen();
        }
    });
    // zen mode
    $(".toggle_zen").click(function(evt) {
        if (editor.getOption('fullScreen') == false) {
            editor.setOption('fullScreen', true);
        } else {
            editor.setOption('fullScreen', false);
        }
    });
    $(document).bind("keydown", function (e) {
        if (e.keyCode == 123) { // F12
            if (editor.getOption('fullScreen') == false) {
                editor.setOption('fullScreen', true);
            } else {
                editor.setOption('fullScreen', false);
            }
        }
    });
    // escape zen and fullscreen
    $(document).bind("keydown", function (e) {
        if (e.keyCode == 27) { // escape
                editor.setOption('fullScreen', false);
                win.leaveFullscreen();
        }
    });

    // word/char-count
    function count(){
        if (editor.getSelection() == '') {
            var txtVal = editor.getValue();
            var words = txtVal.trim().replace(/\s+/gi, ' ').split(' ').length;
            var chars = txtVal.length;
            note('[Document] Words: ' + words + ', Characters: ' + chars);
        } else {
            var txtVal = editor.getSelection();
            var words = txtVal.trim().replace(/\s+/gi, ' ').split(' ').length;
            var chars = txtVal.length;
            note('[Selection] Words: ' + words + ', Characters: ' + chars);
        }

    }
    $(".count").click(function(evt) {
        count();
    });
    $(document).bind("keydown", function (e) {
        if (e.keyCode == 121) { // F10
            count();
        }
    });


    // theme picker
    $(".set_theme").click(function(evt) {
        $('.theme_scroll').html('');
        $('.theme_picker').show('drop', { direction: 'up' }, 160);
        $.each(fs.readdirSync(absolutePath2 + 'themes'), function(index, value){
            var str1 = value;
            var str2 = ".css";
            if(str1.indexOf(str2) != -1){ // check if theme has correct file ext
                var snippetName = value.replace('.css', '');
                $('.theme_scroll').append('<button filen="' + value + '" class="theme">' + snippetName + '</button>');
            }
        });
    });
    $(document).bind("keydown", function (e) {
        if (event.ctrlKey && !event.shiftKey && e.keyCode == 84) {
            $('.theme_scroll').html('');
            $('.theme_picker').show('drop', { direction: 'up' }, 160);
            $.each(fs.readdirSync(absolutePath2 + 'themes'), function(index, value){
                var str1 = value;
                var str2 = ".css";
                if(str1.indexOf(str2) != -1){ // check if theme has correct file ext
                    var snippetName = value.replace('.css', '');
                    $('.theme_scroll').append('<button filen="' + value + '" class="theme">' + snippetName + '</button>');
                }
            });
        }
    });
    $(document).on('mousedown', '.theme', function () {  
        var themeURL =  absolutePath + 'themes/' + $(this).attr('filen'); 
        themeName = $(this).attr('filen');
        localStorage.theme = $(this).attr('filen');
        console.log(themeURL);          
        $(".output").contents().find('.theme').replaceWith('<link class="theme" rel="stylesheet" href="' + themeURL + '" type="text/css" />');
        updateHtml();
    });

    



    // bind shortcuts to scEdit -> edit funtion
    $(document).bind("keydown", function (e) {
        // normal
        scEdit('normal', '**', '**', 66, false, e); // Ctrl+B - bold
        scEdit('normal', '_', '_', 73, false, e); // Ctrl+I - italics
        scEdit('normal', '~~', '~~', 87, false, e); // Ctrl+W - strikethrough
        scEdit('normal', '`', '`', 68, true, e); // Ctrl+Shift+D - inline code
        scEdit('normal', '```\n', '\n```', 65, true, e); // Ctrl+Shift+A - code block
        scEdit('normal', '[', ']()', 72, false, e); // Ctrl+H - hyperlink (edit text)
        scEdit('normal', '[](', ')', 72, true, e); // Ctrl+Shift+H - hyperlink (edit href)
        scEdit('normal', '![', ']()', 81, false, e); // Ctrl+Q - image (alt text)
        scEdit('normal', '![](', ')', 81, true, e); // Ctrl+Shift+Q - image (src)
        scEdit('normal', '<sup>', '</sup>', 190, false, e); // Ctrl+. - sup
        scEdit('normal', '<sub>', '</sub>', 188, false, e); // Ctrl+, - sub
        scEdit('normal', '[', '](' + clipboard.get('text') + ')', 87, true, e); // Ctrl+Shift+W - paste link

        // regex
        scEdit('regex', '> ', 0, 66, true, e); // Ctrl+Shift+B - blockquote
        scEdit('regex', '* ', 0, 76, false, e); // Ctrl+L - unordered list
        scEdit('regex', '0. ', 0, 76, true, e); // Ctrl+Shift+L - ordered list
    });



    // print
    // This will be replaced when print preview is supported in node-webkit
    $('.print').click(function() {
        document.output.printMe();
        win.focus();
    });
    $(document).bind("keydown", function (e) {
        if (event.ctrlKey && !event.shiftKey && e.keyCode == 80) {
            document.output.printMe();
            win.focus();
        }
    });

    // publish [issue]
    $('.publish').click(function() {
        var t = insToc(true, editor.getValue()),
            t = marked(t);
        var mailURL = 'mailto:someone@yoursite.com?body=' + encodeURIComponent(t);
        gui.Shell.openExternal(mailURL);
        console.log(mailURL);
    });
    $(document).bind("keydown", function (e) {
        if (event.ctrlKey && event.shiftKey && e.keyCode == 73) {
            
        }
    });



    // ## Menu show/hide system thingy (subject to change)
    

    $(document).mouseup(function () {
        $('.dropdown').hide();
        $('.theme_picker').hide('drop', { direction: 'down' }, 160);
        menuActive = false;
        editor.focus();
        editBIS = false;
        $('.menu button').css('color', '#AAA');
    });
    $('.menu button').click(function () {
        menuActive = true;
    });
    $('.file').mouseenter(function () {
        if (menuActive === true) {
            $('.dropdown').hide();
            $('.menu button').css('color', '#AAA');
            $('.file_dropdown').show();
            $('.file').css('color', '#888');
        }
    });
    $('.edit').mouseenter(function () {
        if (menuActive === true) {
            $('.dropdown').hide();
            $('.menu button').css('color', '#AAA');
            $('.edit_dropdown').show();
            $('.edit').css('color', '#888');
        }
    });
    $('.options').mouseenter(function () {
        if (menuActive === true) {
            $('.dropdown').hide();
            $('.menu button').css('color', '#AAA');
            $('.options_dropdown').show();
            $('.options').css('color', '#888');
        }
    });
    $('.file').click(function () {
        $('.file_dropdown').show();
        $('.file').css('color', '#888');
    });
    $('.edit').click(function () {
        $('.edit_dropdown').show();
        $('.edit').css('color', '#888');
    });
    $('.options').click(function () {
        $('.options_dropdown').show();
        $('.options').css('color', '#888');
    });
    $('.file_dropdown').click(function () {
        $('.file_dropdown').hide();
    });




    // ## Editor functionality 

    // Snippets
    var allowT = true;
    $(document).bind("keydown", function (e) {
        if (event.ctrlKey && !event.shiftKey && e.keyCode == 9) {
            if (!allowT) return;
            $('.snippets').show();
            console.log(absolutePath2)
            $.each(fs.readdirSync(absolutePath2 + 'snippets'), function(index, value){
                var str1 = value;
                var str2 = ".snippet";
                if(str1.indexOf(str2) != -1){ // check if snippet has correct file ext
                    var snippetName = value.replace('.snippet',  '');
                $('.snippet_scroll').append('<button filen="' + value + '" class="snippet">' + snippetName + '</button>');
                }                
            });
            allowT = false;
        }
        $('.snippet').click(function () {
            var path = absolutePath2 + 'snippets/' + $(this).attr('filen');
            fs.readFile(path, 'utf8', function (err,data) {
                if (err) {
                    console.log(err);
                } else {
                    data = data.replace(/^\uFEFF/, '');
                    editor.replaceSelection(data, 'end');
                }
            });
        });
    });
    $(document).bind("keyup", function (e) {
        if (event.ctrlKey || e.keyCode == 9) {
            $('.snippets').hide();
            $('.snippet_scroll').html('');
            allowT = true;
        }
    });


    // notifications
    function note(text) {
        $('.note').hide();
        $('body').append('<div class="note">' + text + '</div>');
        $('.note').delay(2000).fadeOut(400);
    }
    
    // Update ouput every second when content is changed
    window.setInterval(function(){
        if (sleep == false) {
            updateHtml();
            if (selM == true) {
                var elem1 = $('.CodeMirror-vscrollbar'),
                    maxScrollTop1 = elem1[0].scrollHeight - elem1.outerHeight() - 600,

                    elem2 = $('.output').contents().find('.content'),
                    maxScrollTop2 = elem2[0].scrollHeight - elem1.outerHeight(),

                    v = $('.CodeMirror-vscrollbar').scrollTop() * 100 / maxScrollTop1,

                    scT = maxScrollTop2 * v / 100;


                $('.output').contents().find('.content').animate({ scrollTop: scT });
            }
            sleep = true;
        }      
    }, 250); // larger = less cpu = slower update speed

    (function($) {
        $.fn.hasScrollBar = function() {
            return this.get(0).scrollHeight > this.height();
        }
    })(jQuery);
    

    // Switch focus on ctrl+alt+shift
    $(document).bind("keydown", function (event) {
        if (event.altKey && event.ctrlKey && event.shiftKey) {
            switchSel();
            //updateHtml(); // why?
        }
    });
    // toggle preview
    $(document).bind("keydown", function (e) {
        if (event.ctrlKey && event.shiftKey && e.keyCode == 80) {
            if (editor.getOption('fullScreen') == false) {
                togglePreview();
            }
        }
    });
    // larger font
    $(document).bind("keydown", function (e) {
        if (event.ctrlKey && !event.shiftKey && e.keyCode == 107) {
            var fontSize = parseInt($(".CodeMirror").css("font-size"));
            fontSize = fontSize + 1 + "px";
            $(".CodeMirror").css("font-size", fontSize);
            editor.refresh();
            localStorage.font = fontSize;
            note('Font size: ' + fontSize);
        }
    });
    // smaller font
    $(document).bind("keydown", function (e) {
        if (event.ctrlKey && !event.shiftKey && e.keyCode == 109) {
            var fontSize = parseInt($(".CodeMirror").css("font-size"));
            fontSize = fontSize - 1 + "px";
            $(".CodeMirror").css("font-size", fontSize);
            editor.refresh();
            localStorage.font = fontSize;
            note('Font size: ' + fontSize);
        }
    });
    // reset font
    $(document).bind("keydown", function (e) {
        if (event.ctrlKey && !event.shiftKey && e.keyCode == 111) {
            $(".CodeMirror").css("font-size", '15px');
            editor.refresh();
            localStorage.font = "";
            note('Font size: 15px');
        }
    });

    // ### Switch focus buttons

    $('.markdown').click(function () {
        sel(M);
    });
    $('.html').click(function () {
        sel(H);
    });

    // ### Scrollbar sync
$('.output').load(function(){

    // Update every time content changes
    editor.on("change", function () {
        edited = true;
        $('title').html(documentPath + ' • (' + getTitle() + ') - ' + appName);

        editBIS = false;
        sleep = false;

    });

    $('.CodeMirror-vscrollbar').on('scroll', function () {
        if (selM == true) {
            var elem1 = $('.CodeMirror-vscrollbar'),
                maxScrollTop1 = elem1[0].scrollHeight - elem1.outerHeight() - 600,

                elem2 = $('.output').contents().find('.content'),
                maxScrollTop2 = elem2[0].scrollHeight - elem1.outerHeight(),

                v = $('.CodeMirror-vscrollbar').scrollTop() * 100 / maxScrollTop1,

                scT = maxScrollTop2 * v / 100;


            $('.output').contents().find('.content').scrollTop(scT);
        }
    });

    

        // open file
        console.log(gui.App.argv.length);
        if (gui.App.argv.length !== 0) {
            documentPath = gui.App.argv[0];
            $.when ( openFile(documentPath) ).then(function () {
                $('title').html(documentPath + ' (' + getTitle() + ') - ' + appName);
                console.log('New file opened');
                editor.clearHistory();
            });
        }

        $('.output').contents().find('.content').on('scroll', function () {

            if (selH == true) {
                var elem1 = $('.CodeMirror-vscrollbar'),
                    maxScrollTop1 = elem1[0].scrollHeight - elem1.outerHeight() - 600,

                    elem2 = $('.output').contents().find('.content'),
                    maxScrollTop2 = elem2[0].scrollHeight - elem2.outerHeight(),

                    v = elem2.scrollTop() * 100 / maxScrollTop2,

                    scT = maxScrollTop1 * v / 100;

                $('.CodeMirror-vscrollbar').scrollTop(scT);
            }
        });    
    });
});