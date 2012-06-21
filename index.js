// Bulldozer...
// Simple content extraction.

var Castor = require("castor");

var Psychic = function(htmlData) {
	this.data = typeof htmlData === "string" ? htmlData : htmlData.toString("utf8");
	this.parseTree = this.parse(this.data);
	this.doctype = "";
};

Psychic.prototype.getTitle = function() {
	var titleMatch = this.data.match(/<title>([^<]+)<\/title>/i);
	
	if (titleMatch) {
		return titleMatch.pop()
					.replace(/^\s+/,"")
					.replace(/\s+$/,"")
					.replace(/\s+/," ");
	} else {
		return "[[Untitled/Unknown Document]]";
	}
};

Psychic.prototype.getContent = function() {
	// Unwritten algorithm ideas:
	// Define certain nodes as being highly relevant to 'text' content. P, STRONG, B, U, I, OL, UL, LI, etc.
	// Return node with greatest proportion of these text nodes as direct children, or ancestors.
	// Ancestor elements are rated less highly.
	// Potentially weight text nodes as being more likely to contain real content (as opposed to UI elements, menus etc)
	// by the number of words they contain.
	// Nodes with negative weight would include script tags, link tags, etc.
	// Also use 'flatness' as a deciding factor. Flatness would be number of direct children divided by total decendant nodes.
	
	var contentSplit = this.data.split(/<div class\=\"content\">/ig).pop();
		contentSplit = contentSplit.split(/<\/div>/i).shift();
	
	return contentSplit;
};

exports.Psychic = Psychic;