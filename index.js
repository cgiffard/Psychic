// Psychic...
// Simple content extraction.
// Christopher Giffard


// WARNING!

/// This is INCREDIBLY messy. I'll tidy this up for human consumption later.

(function(glob) {
	var Castor = require("castor");
	var bulldozer = new (require("./bulldozer.js"))();
	
	// Very general function for walking an arbitrary data structure and
	// returning components based on an evaluated expression...
	function walkFor(tree,testFunction,depth) {
		testFunction = testFunction instanceof Function ? testFunction : function(){ return false; };
		depth = depth || 1;
		var found = [];
		
		if (testFunction(tree,depth)) {
			found.push(tree);
		}
		
		if (tree instanceof Object) {
			for (var treeProp in tree) {
				if (tree.hasOwnProperty(treeProp)) {
					if (typeof tree[treeProp] === "array" ||
						typeof tree[treeProp] === "object") {
							
						if (treeProp !== "parentNode") {
							found = found.concat(walkFor(tree[treeProp],testFunction,depth+1));
						}
					}
				}
			}
			
		} else if (tree instanceof Array) {
			tree.forEach(function(treeItem) {
				if (typeof treeItem === "array" ||
					typeof treeItem === "object") {
					
					found = found.concat(walkFor(treeItem,testFunction,depth+1));
					
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
		var isTextContainer = /(body|div|article|section|layer|header|aside)/i;
		
		function countNonTextNodes(node) {
			return getElementsByTagName(node,isNonText).length;
		}
		
		function countTextNodes(node) {
			return getElementsByTagName(node,isText).length;
		}
		
		function tallyNodeScores(node) {
			var totalNodeScore = 0;
			
			// Should replace with some kind of bayesian-ish-ly determined score in future,
			// but this 'guessed' value list should do for now.
			var nodeScores = {
				"other": 1,
				"p": 20,
				"blockquote": 15,
				"li": -2,
				"ul": 4,
				"ol": 8,
				"dl": 8,
				"dt": 8,
				"dd": 8,
				"code": 5,
				"a": -2,
				"th": 5,
				"thead": 5,
				"tbody": 5,
				"tfoot": 5,
				"aside": 10,
				"strong": 2,
				"em": 3,
				"b": 2,
				"u": 2,
				"i": 2,
				"h1": 2,
				"h2": 3,
				"h3": 2,
				"h4": 4,
				"h5": 6,
				"h6": 6,
				"script": -20,
				"style": -100,
				"article": 2,
				"link": -10,
				"meta": -10,
				"title": -10,
				"img": 3,
				"figure": 5,
				"header": 20,
				"br": 3,
				"footer": -3,
				"section": 2,
				"div": -10,
				"span": 1,
				"noscript": -5,
				"body": -10,
				"nav": -10,
				"form": -20,
				"input": -3,
				"button": -3,
				"q": 4,
				"time": -5,
				"iframe": -20,
				"span": -2
			};
			
			var attributeKeywords = {
				"other": 0,
				"content": 50,
				"article": 20,
				"main": 10,
				"articlebody": 100,
				"comment": -200,
				"comments": -200,
				"javascript": -5,
				"viewstate": -100,
				"footer": -50,
				"advertisement": -10,
				"ad": -1,
				"item": -1,
				"avatar": -3,
				"story": 3,
				"midarticle": 10,
				"post": 30,
				"entry": 10,
				"published": 30,
				"node": 10,
				"title": 10,
				"children": -10,
				"reply": -20,
				"block": -20,
				"form": -10,
				"instapaper": 1000,
				"midarticle": 30,
				"copyright": -20,
				"widget": -100,
				"discussion": -100,
				"discussions": -100,
				"recent": -100,
				"categories": -50,
				"list": -30,
				"clearfix": -10,
				"disqus": -100
			};
			
			var scanTextLengthIn = {
				"p": 1,
				"li": 1,
				"aside": 1,
				"article": 1,
				"blockquote": 1,
				"td": 1,
				"th": 1
			};
			
			var textLengthThreshold = 10;
			
			walkFor(node,function(testNode,relativeDepthOfCurrentNode) {
				// We use the relative depth of the current node to balance negative and positive weighting.
				// We want to get as close to the actual content as possible, so the flatter the node, the better.
				var currentNodeScore = 0;
				
				if (testNode && testNode.tagName) {
					if (!!nodeScores[testNode.tagName] && !isNaN(nodeScores[testNode.tagName])) {
						currentNodeScore += (nodeScores[testNode.tagName]/relativeDepthOfCurrentNode);
					} else {
						currentNodeScore += (nodeScores.other/relativeDepthOfCurrentNode);
					}
					
					if (testNode.attributes) {
						// Scan for keywords in node attributes...
						for (attribute in testNode.attributes) {
							if (testNode.attributes.hasOwnProperty(attribute)) {
								// Split up attribute into 'words'
								var words = String(testNode.attributes[attribute]).split(/[^a-z]/ig);
								
								words
									.filter(function(word) {
										return !!word.match(/[a-z]/ig);
									})
									.forEach(function(word) {
										word = word.toLowerCase().replace(/\s+/g,"");
										
										if (attributeKeywords[word]) {
											currentNodeScore += attributeKeywords[word] < 0 ? attributeKeywords[word] : attributeKeywords[word]/relativeDepthOfCurrentNode;
										} else {
											//console.log("Unhandled attribute keyword",word);
											currentNodeScore += attributeKeywords.other/relativeDepthOfCurrentNode;
										}
									});
							}
						}
					}
					
					// Combine score with text length analysis
					if (scanTextLengthIn[String(testNode.tagName).toLowerCase()]) {
						var words = testNode.getText().split(/[^a-z0-9]/ig).filter(function(word) {
							return word.replace(/[^a-z0-9]/ig,"").length;
						});
						
						// If the number of words in the element is lower than the threshold,
						// this part of the algorithm will scale down the score for this node.
						// If it's larger, it'll scale it up.
						currentNodeScore += (words.length / 10);
					}
					
					totalNodeScore += currentNodeScore;
				}
				
				return false;
			});
			
			return totalNodeScore;
		}
		
		// Find node score...
		function findNodeScore(node) {
			if (node.nodeType === 1) {
				var descendantCount			= countDescendants(node) || 0;
				var childElementCount		= countElementChildren(node) || 0;
				var childDescendantRatio	= (childElementCount / descendantCount) || 0;
				var nodeWords				= countNodeWords(node) || 0;
				var nodeLinkWords			= countLinkWords(node) || 0;
				var linkWordsToWords		= (nodeWords / nodeLinkWords) || 0;
				var nonTextNodes			= countNonTextNodes(node) || 0;
				var textNodes				= countTextNodes(node) || 0;
				var textNodesToNodes		= (textNodes / descendantCount) || 0;
				var nodeText				= node.getText();
				var whitespaceToText		= nodeText.replace(/\S/ig,"").length / nodeText.replace(/\s/ig,"").length;
				
				var nodeScore = tallyNodeScores(node);
				
				var digest = (descendantCount * childDescendantRatio) * textNodesToNodes * (linkWordsToWords < Infinity ? linkWordsToWords : 1) * (nodeScore * whitespaceToText);
				
				return {"node":node,"score":digest};
			}
		}
		
		var regionList = getElementsByTagName(this.parseTree,isTextContainer).map(findNodeScore);
		
		if (!regionList.length) {
			return null;
		}
		
		var sortedList = regionList.sort(function(a,b) {
				return b.score - a.score;
			})
			.slice(0,5)
			.map(function(region) {
				return bulldozer.doze(region.node);
			});
			
		return sortedList;
	};
	
	function psychic(htmlData) {
		return new Psychic(htmlData);
	}
	
	(typeof module != "undefined" && module.exports) ? (module.exports = psychic) : (typeof define != "undefined" ? (define("psychic", [], function() { return psychic; })) : (glob.castor = psychic));
})(this);