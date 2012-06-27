// Psychic...
// Simple content extraction.
// Christopher Giffard

(function(glob) {
	var Castor = require("castor");
	
	// Very general function for walking an arbitrary data structure and
	// returning components based on an evaluated expression...
	function walkFor(tree,testFunction) {
		testFunction = testFunction instanceof Function ? testFunction : function(){ return false; };
		var found = [];
		
		if (testFunction(tree)) {
			found.push(tree);
		}
		
		if (tree instanceof Object) {
			for (var treeProp in tree) {
				if (tree.hasOwnProperty(treeProp)) {
					if (typeof tree[treeProp] === "array" ||
						typeof tree[treeProp] === "object") {
							
						if (treeProp !== "parentNode") {
							found = found.concat(walkFor(tree[treeProp],testFunction));
						}
					} else {
						if (testFunction(tree[treeProp])) {
							found.push(tree[treeProp])
						}
					}
				}
			}
			
		} else if (tree instanceof Array) {
			tree.forEach(function(treeItem) {
				if (typeof treeItem === "array" ||
					typeof treeItem === "object") {
					
					found = found.concat(walkFor(treeItem,testFunction));
					
				} else {
					if (testFunction(treeItem)) {
						found.push(treeItem)
					}
				}
			})
		}
		
		return found;
	}
	
	function getElementsByTagName(node,tagName) {
		return walkFor(node,function(subNode) {
			return subNode && subNode.nodeType === 1 && subNode.tagName.toLowerCase() === tagName.toLowerCase();
		});
	}
	
	var Psychic = function(htmlData) {
		this.parser = new Castor();
		this.data = typeof htmlData === "string" ? htmlData : htmlData.toString("utf8");
		this.parseTree = null;
		this.doctype = "";
	};
	
	// Get ready to extract content...
	Psychic.prototype.prepare = function() {
		if (this.parseTree === null) {
			this.parseTree = this.parser.parse(this.data);
		}
	}
	
	Psychic.prototype.getTitle = function() {
		// Ensure we're ready...
		this.prepare();
		
		// Find title nodes...
		var titleText = getElementsByTagName(this.parseTree,"title");
		
		titleText = titleText.map(function(node) {
				return node.getText().replace(/\s+/g," ").replace(/^\s+/,"").replace(/\s+$/,"");
			})
			.filter(function(text) {
				return text && text.replace(/\s+/g,"").length;
			});
		
		if (titleText.length) {
			var titleText = titleText[0];
			
			titleText =
				titleText
					.replace(/\s+/ig," ")
					.replace(/^\s+/ig,"")
					.replace(/\s+$/ig,"");
			
			return titleText;
		} else {
			return null;
		}
	};
	
	Psychic.prototype.getDocumentHeading = function() {
		// Ensure we're ready...
		this.prepare();
		
		// Find title nodes...
		var headingText = walkFor(this.parseTree,function(node) {
			if (!!node && !!node.tagName && node.tagName.match(/^h\d/i)) {
				
				return true;
			}
			
			return false;
		});
		
		headingText.forEach(function(node) {
			var nodeText = node.getText().replace(/[\r\n]/ig," ").replace(/\s+/ig," ").replace(/^\s+/,"").replace(/\s+$/,"");
			//console.log(node.tagName + " " + nodeText);
		});
		
		if (headingText.length) {
			var headingText = headingText[0].textContent;
			
			headingText =
				headingText
					.replace(/\s+/ig," ")
					.replace(/^\s+/ig,"")
					.replace(/\s+$/ig,"");
			
			return headingText;
		} else {
			return null;
		}
	};
	
	Psychic.prototype.getContent = function() {
		// Ensure we're ready...
		this.prepare();
		
		// Function to find number of descendant nodes given a single node
		// Appends some tagging/other properties to nodes:
		// .descendantCount
		function countDescendants(node) {
			if (node.descendantCount && !isNaN(node.descendantCount)) return node.descendantCount;
			
			var descendantCount = node.childNodes.length || 0;
			
			node.childNodes.forEach(function(childNode) {
				descendantCount += countDescendants(childNode);
			});
			
			return node.descendantCount = descendantCount;
		}
		
		function countNodeWords(node) {
			if (!node || !node.getText) return 0;
			
			var nodeText = node.getText();
			var wordSplit = /[^a-z0-9\-]+/ig;
			
			return nodeText.split(wordSplit).filter(function(item) {
				return item && !!item.match(/[a-z0-9]/ig);
			}).length;
		}
		
		function countLinkWords(node) {
			var links = walkFor(node,function(subNode) {
				return subNode && subNode.nodeType === 1 && subNode.tagName.toLowerCase() === "a";
			});
			
			var linkWords = links.reduce(function(tally,link) {
				return tally + countNodeWords(link);
			},0);
			
			return linkWords;
		}
		
		var nodeSorted = [];
		
		// Find node score...
		function findNodeScore(node) {
			if (node.nodeType === 1) {
				var descendantCount = countDescendants(node);
				var childDescendantRatio = (node.childNodes.length||0) / descendantCount;
				var flatness = node.childNodes.length * 10;
				var nodeWords = countNodeWords(node);
				var nodeLinkWords = countLinkWords(node);
				var wordRatio = nodeWords / nodeLinkWords;
				console.log(node.tagName);
				console.log("ChildDescendant Ratio",childDescendantRatio);
				console.log("NODEWORDS",nodeWords);
				console.log("AWORDS",nodeLinkWords);
				console.log("FLATNESS:",flatness)
				
				//console.log(node.tagName + ": Score: ",childDescendantRatio*flatness*wordRatio);
				//nodeSorted.push({"node":node,"score":childDescendantRatio*flatness*wordRatio});
			}
		}
		
		walkFor(this.parseTree,function(node) {
			if (node && node.nodeType) {
				findNodeScore(node);
			}
		});
		
		console.log(nodeSorted.sort(function(a,b) {
			return b.score - a.score;
		}).slice(0,10))
		
		// Unwritten algorithm ideas:
		// Define certain nodes as being highly relevant to 'text' content. P, STRONG, B, U, I, OL, UL, LI, etc.
		// Return node with greatest proportion of these text nodes as direct children, or ancestors.
		// Ancestor elements are rated less highly.
		// Potentially weight text nodes as being more likely to contain real content (as opposed to UI elements, menus etc)
		// by the number of words they contain.
		// Nodes with negative weight would include script tags, link tags, etc.
		// Also use 'flatness' as a deciding factor. Flatness would be number of direct children divided by total decendant nodes.
		//
		//var contentSplit = this.data.split(/<div class\=\"content\">/ig).pop();
		//	contentSplit = contentSplit.split(/<\/div>/i).shift();
		
		return "";
	};
	
	function psychic(htmlData) {
		return new Psychic(htmlData);
	}
	
	(typeof module != "undefined" && module.exports) ? (module.exports = psychic) : (typeof define != "undefined" ? (define("psychic", [], function() { return psychic; })) : (glob.castor = psychic));
})(this);