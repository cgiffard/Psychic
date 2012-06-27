// Psychic...
// Simple content extraction.
// Christopher Giffard

function printAttr(tree) {
	var attrs = [];
	for (attrName in tree.attributes) {
		if (tree.attributes.hasOwnProperty(attrName)) {
			attrs.push(attrName + "='" + tree.attributes[attrName] + "'");
		}
	}

	return attrs.length ? " " + attrs.join(" ") : "";
}

function logTree(tree,depth) {
	var indent = "", depth = depth || 0;
	while (indent.length < depth) indent += "\t";

	if (tree.nodeType === 3) {
		if (tree.textContent.replace(/\s+/ig,"").length) {
			console.log(indent + tree.textContent.replace(/\s+/ig," "));
		}
	} else if (tree.nodeType === 8) {
		console.log(indent + "<!-- " + tree.textContent.replace(/\s+/ig," ") + " -->");
	} else if (tree.nodeType === 1) {
		var nodeAttributes = printAttr(tree);
		console.log(indent + "<" + tree.tagName + nodeAttributes + (tree.childNodes.length ? "" : "/") + ">");
	} else if (tree.nodeType === 99) {
		// Ignore document node, but decrement depth to balance tree...
		depth --;
	} else {
		console.log(indent + "<? [[ " + tree.nodeType + ":" + tree.nodeValue + " ]] ?>");
	}

	if (tree && tree.childNodes && tree.childNodes.length) {
		tree.childNodes.forEach(function(node) {
			logTree(node,depth+1);
		});

		if (tree.nodeType === 1) {
			console.log(indent + "</" + tree.tagName + ">");
		}
	}
};
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
					}
				}
			}
			
		} else if (tree instanceof Array) {
			tree.forEach(function(treeItem) {
				if (typeof treeItem === "array" ||
					typeof treeItem === "object") {
					
					found = found.concat(walkFor(treeItem,testFunction));
					
				}
			})
		}
		
		return found;
	}
	
	function getElement(node,testFunction) {
		return walkFor(node,function(subNode) {
			if (subNode && subNode.nodeType === 1) {
				return testFunction(subNode);
			}
			return false;
		});
	}
	
	function getElementsByTagName(node,tagName) {
		return getElement(node,function(subNode) {
			if (tagName instanceof RegExp) {
				return !!tagName.exec(subNode.tagName);
				
			} else {
				return subNode.tagName.toLowerCase() === tagName.toLowerCase();
				
			}
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
		var headingText = getElementsByTagName(this.parseTree,/^h\d/i);
		
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
		
		function countElementChildren(node) {
			return node.childNodes.filter(function(subNode) {
				return subNode.nodeType === 1;
			}).length || 0;
		}
		
		// Function to find number of descendant nodes given a single node
		// Appends some tagging/other properties to nodes:
		// .descendantCount
		function countDescendants(node) {
			if (node.descendantCount && !isNaN(node.descendantCount)) return node.descendantCount;
			
			var descendantCount = countElementChildren(node);
			
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
			var links = getElementsByTagName(node,"a");
			var linkWords = links.reduce(function(tally,link) {
				return tally + countNodeWords(link);
			},0);
			
			return linkWords;
		}
		
		var isNonText = /(area|base|keygen|link|meta|title|script|style|head|html|form|input|button)/i;
		var isText = /(p|ul|ol|li|blockquote|code|th|td|dt|dl|dd|thead|tbody|h\d|strong|b|i|u)/i;
		var isTextContainer = /(body|div|article|section|layer|header)/i;
		
		function countNonTextNodes(node) {
			return getElementsByTagName(node,isNonText).length;
		}
		
		function countTextNodes(node) {
			return getElementsByTagName(node,isText).length;
		}
		
		// Find node score...
		function findNodeScore(node) {
			if (node.nodeType === 1) {
				var descendantCount = countDescendants(node);
				var childElementCount = countElementChildren(node);
				var childDescendantRatio = (childElementCount / descendantCount) || 0;
				var nodeWords = countNodeWords(node);
				var nodeLinkWords = countLinkWords(node);
				var linkWordsToWords = (nodeWords / nodeLinkWords) || 0;
				var nonTextNodes = countNonTextNodes(node);
				var textNodes = countTextNodes(node);
				var textNodesToNodes = (textNodes / descendantCount) || 0;
				
				var digest = (descendantCount * childDescendantRatio) * textNodesToNodes * (linkWordsToWords < Infinity ? linkWordsToWords : 1);
				
				return {"node":node,"score":digest};
			}
		}
		
		var nodeSorted = getElementsByTagName(this.parseTree,isTextContainer).map(findNodeScore);
		
		if (!nodeSorted.length) {
			return null
		}
		
		return nodeSorted.sort(function(a,b) {
			return b.score - a.score;
		}).slice(0,1).node;
		
		// Unwritten algorithm ideas:
		// Define certain nodes as being highly relevant to 'text' content. P, STRONG, B, U, I, OL, UL, LI, etc.
		// Return node with greatest proportion of these text nodes as direct children, or ancestors.
		// Ancestor elements are rated less highly.
		// Potentially weight text nodes as being more likely to contain real content (as opposed to UI elements, menus etc)
		// by the number of words they contain.
		// Nodes with negative weight would include script tags, link tags, etc.
		// Also use 'flatness' as a deciding factor. Flatness would be number of direct children divided by total decendant nodes.
		//
	};
	
	function psychic(htmlData) {
		return new Psychic(htmlData);
	}
	
	(typeof module != "undefined" && module.exports) ? (module.exports = psychic) : (typeof define != "undefined" ? (define("psychic", [], function() { return psychic; })) : (glob.castor = psychic));
})(this);