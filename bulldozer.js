// Bulldozer
// Takes a Castor tree and trims the fat.

(function(glob) {
	"use strict";
	
	// Really just wrapping a function to make it fit better as a module.
	// I'll probably change this in future, but for now it stays.
	function Bulldozer() {}
	
	// Nodes we want to include in the final output...
	var nodeWhiteList = {
		"article":		true,
		"aside":		true,
		"section":		true,
		"nav":			true,
		"h1":			true,
		"h2":			true,
		"h3":			true,
		"h4":			true,
		"h5":			true,
		"h6":			true,
		"hgroup":		true,
		"header":		true,
		"footer":		true,
		"address":		true,
		"p":			true,
		"hr":			true,
		"pre":			true,
		"blockquote":	true,
		"ol":			true,
		"ul":			true,
		"li":			true,
		"dl":			true,
		"dt":			true,
		"dd":			true,
		"figure":		true,
		"figcaption":	true,
		"center":		true,
		"a":			true,
		"abbr":			true,
		"acronym":		true,
		"b":			true,
		"big":			true,
		"br":			true,
		"cite":			true,
		"code":			true,
		"dfn":			true,
		"em":			true,
		"i":			true,
		"kbd":			true,
		"listing":		true,
		"mark":			true,
		"q":			true,
		"rp":			true,
		"rt":			true,
		"ruby":			true,
		"s":			true,
		"samp":			true,
		"small":		true,
		"span":			true,
		"strike":		true,
		"strong":		true,
		"sub":			true,
		"sup":			true,
		"time":			true,
		"tt":			true,
		"u":			true,
		"ins":			true,
		"del":			true,
		"img":			true,
		"video":		true,
		"audio":		true,
		"source":		true,
		"track":		true,
		"canvas":		true,
		"math":			true,
		"svg":			true,
		"table":		true,
		"caption":		true,
		"colgroup":		true,
		"col":			true,
		"tbody":		true,
		"thead":		true,
		"tfoot":		true,
		"tr":			true,
		"td":			true,
		"th":			true
	};
	
	// Nodes we do NOT want to include in the final output...
	var nodeBlackList = {
		"script":		true,
		"style":		true,
		"iframe":		true,
		"embed":		true,
		"object":		true,
		"map":			true,
		"area":			true,
		"applet":		true,
		"param":		true,
		"frameset":		true,
		"frame":		true
	};
	
	var attributeWhitelist = {
		"rel":			true,
		"href":			true,
		"src":			true,
		"alt":			true,
		"title":		true,
		"width":		true,
		"height":		true,
		"role":			true,
		"name":			true,
		"summary":		true,
		"rowspan":		true,
		"colspan":		true,
		"srclang":		true,
		"type":			true
	};
	
	// Elements which should not include any content.
	var voidElements = {
		"area":			true,
		"base":			true,
		"br":			true,
		"col":			true,
		"command":		true,
		"embed":		true,
		"hr":			true,
		"img":			true,
		"input":		true,
		"keygen":		true,
		"link":			true,
		"meta":			true,
		"param":		true,
		"source":		true,
		"track":		true,
		"wbr":			true
	 };
	 
	// Clones an object (but not a deep clone.)
	Bulldozer.prototype.flatClone = function(object) {
		if (typeof object === "array" || object instanceof Array) {
			var newArr = [];
			
			for (var index = 0; index < object.length; index ++) {
				newArr.push(object[index]);
			}
			
			return newArr;
			
		} else if (typeof object === "object") {
			var newObj = {};
			
			for (var prop in object) {
				if (object.hasOwnProperty(prop)) {
					newObj[prop] = object[prop];
				}
			}
			
			return newObj;
			
		}
		
		// Not an object or array.
		return object;
	};
	
	Bulldozer.prototype.doze = function(inputTree,depth) {
		// Starting simple. Just removing scripts, comments,
		// XML processing nodes, CDATA, and style.
		// Also removes nodes with no meaningful content.
		// I flatten div elements and contract all whitespace to a single space.
		// Destroy anchors with javascript onclick only, or a hash URL without anchor name
		// We also decouple the root node from its parent.
		
		var self = this;
		
		if (!depth) {
			inputTree.parentNode = null;
			depth = 0;
		}
		
		// Function for the easy bulldozing of children. ;-)
		function bulldozeChildren(childNodes,depth) {
			var newChildNodeList = [];
			childNodes.forEach(function(node) {
				var tagName = String(node.tagName || "").toLowerCase().replace(/[^a-z0-9]/ig,"");
				node.tagName = tagName;
				
				cleanAttributes(node);
				
				if (!nodeIsMeaningful(node)) return;
				
				// Whitelisted nodes will be completely scanned.
				if (node.nodeType === 1 && nodeWhiteList[tagName]) {
					newChildNodeList.push(self.doze(node,depth+1));
				
				// Unlisted nodes will have their children and innertext scanned.
				// Blacklisted nodes will be dropped entirely.
				} else if (node.nodeType === 1 && !nodeBlackList[tagName]) {
					// Not blacklisted, but not whitelisted.
					// Loop through children and bulldoze them as children of our current node.
					if (node.childNodes && node.childNodes.length) {
						newChildNodeList = newChildNodeList.concat(bulldozeChildren(node.childNodes,depth+1));
					}
					
				} else if (node.nodeType === 3) {
					node.textContent = node.textContent.replace(/\t/g,"").replace(/[\n\r]+/ig,"\n").replace(/[\ ]+/g," ");
					newChildNodeList.push(node);
				}
			});
			
			return newChildNodeList;
		}
		
		function nodeIsMeaningful(node) {
			if (node.getText().replace(/\s+/,"").length) {
				return true;
			}
			
			if (node.nodeType === 1) {
				if (voidElements[node.tagName]) {
					
					// Extend on this check in future. For the time being we consider all void elements useful.
					return true;
					
				} else {
					
					// OK. Loop through our children to find out whether there's anything meaningful down the tree...
					if (node.childNodes.length) {
						for (var nodeIndex = 0; nodeIndex < node.childNodes.length; nodeIndex++) {
							if (nodeIsMeaningful(node.childNodes[nodeIndex])) return true; 
						}
					}
					
					return false;
				}
			} else {
				// If we didn't return any useful text in the stage before,
				// consider this node useless.
				return false;
			}
		}
		
		function cleanAttributes(node) {
			var newAttributes = {};
			
			if (!node.attributes) return;
			
			for (var attrName in node.attributes) {
				if (!attributeWhitelist[attrName]) {
					delete node.attributes[attrName];
				}
			}
		}
		
		// Create a flat clone of the current working object
		// Clone the child node list as well so we can stuff with it
		// without disrupting the original...
		var newTree = self.flatClone(inputTree);
		
		// Do a couple of things to this node first...
		newTree.tagName = String(newTree.tagName || "").toLowerCase().replace(/[^a-z0-9]/g,"");
		cleanAttributes(newTree);
		
		// And now process the children.
		newTree.childNodes = bulldozeChildren(newTree.childNodes,depth);
		
		return newTree;
	};
	
	function bulldozer() {
		return new Bulldozer();
	}
	
	(typeof module != "undefined" && module.exports) ? (module.exports = bulldozer) : (typeof define != "undefined" ? (define("bulldozer", [], function() { return bulldozer; })) : (glob.castor = bulldozer));
})(this);