(function() {
  'use strict';

  var listRE = /^(\s*)([*+-]|(\d+)\.)(\s*)/,
      unorderedBullets = '*+-';

  CodeMirror.commands.newlineAndIndentContinueMarkdownList = function(cm) {
    var pos = cm.getCursor(),
        inList = cm.getStateAfter(pos.line).list !== false,
        match;

    if (!inList || !(match = cm.getLine(pos.line).match(listRE))) {
      cm.execCommand('newlineAndIndent');
      return;
    }

    var indent = match[1], after = match[4];
    var bullet = unorderedBullets.indexOf(match[2]) >= 0
      ? match[2]
      : (parseInt(match[3], 10) + 1) + '.';

    cm.replaceSelection('\n' + indent + bullet + after, 'end');
      
    var obj = editor.getCursor();
    var bq = editor.getLine(obj.line - 1),
        pb1 = /^\s*\*\s*$/,
        pb2 = /^\s*\+\s*$/,
        pb3 = /^\s*\-\s*$/,
        pb4 = /^\s*\d+\.\s*$/;  
    if (pb1.test(bq) || pb2.test(bq) || pb3.test(bq) || pb4.test(bq)) {
            editor.replaceRange(obj.line);
            editor.setLine(obj.line - 1 , '');
    }
  };

}());
