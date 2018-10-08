// This script has been forked on serach.js for codemirror addon script
// It performs searching strings without prompting for it
// Dependant on searchcursor.js
// The strings enclosed in / (slashes) will be interpreted as regular expression

(function() {

  function searchOverlay(query) {
    if (typeof query == "string") return {token: function(stream) {
      if (stream.match(query)) return "searching";
      stream.next();
      stream.skipTo(query.charAt(0)) || stream.skipToEnd();
    }};
    return {token: function(stream) {
      if (stream.match(query)) return "searching";
      while (!stream.eol()) {
        stream.next();
        if (stream.match(query, false)) break;
      }
    }};
  }

  function SearchState() {
    this.posFrom = this.posTo = this.query = null;
    this.overlay = null;
  }
  
  function getSearchState(cm) {
    return cm._searchState || (cm._searchState = new SearchState());
  }
  
  function getSearchCursor(cm, query, pos) {
    // Heuristic: if the query string is all lowercase, do a case insensitive search.
    return cm.getSearchCursor(query, pos, typeof query == "string" && query == query.toLowerCase());
  }
  
  function parseQuery(query) {
    var isRE = query.match(/^\/(.*)\/([a-z]*)$/);
    return isRE ? new RegExp(isRE[1], isRE[2].indexOf("i") == -1 ? "" : "i") : query;
  }
  
  // Main function that do the search
  function doSearchMyString(cm, rev, query) {
	var state = getSearchState(cm);
	if (state.query) return findNext(cm, rev, query);
	cm.operation(function() {
		if (!query || state.query) return;
		state.query = parseQuery(query);
		cm.removeOverlay(state.overlay);
		state.overlay = searchOverlay(query);
		cm.addOverlay(state.overlay);
		state.posFrom = state.posTo = cm.getCursor();
		findNext(cm, rev, query);
    });
   }
  
  function findNext(cm, rev, query) {cm.operation(function() {
    var state = getSearchState(cm);
    var cursor = getSearchCursor(cm, state.query, rev ? state.posFrom : state.posTo);
    if (!cursor.find(rev)) {
      cursor = getSearchCursor(cm, state.query, rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(cm.firstLine(), 0));
      if (!cursor.find(rev)) return;
    }
    cm.setSelection(cursor.from(), cursor.to());
    state.posFrom = cursor.from(); state.posTo = cursor.to();
  });}

  CodeMirror.commands.findNext = function(cm, query) {doSearchMyString(cm, false, query);};
  CodeMirror.commands.findPrev = function(cm, query) {doSearchMyString(cm, true, query);};
})();
