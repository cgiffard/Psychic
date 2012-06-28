#!/usr/bin/env node

// Parses and extracts title and content from all the documents in the 'test' folder

var fs = require("fs"),
	Psychic = require("./");


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
		//console.log(indent + "<!-- " + tree.textContent.replace(/\s+/ig," ") + " -->");
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


// Read out the contents of the directory...
fs.readdir("./test",function(err,dirContents) {
	if (err) throw err;
	
	// No errors? Loop through each of these files, read, parse, show titles.
	dirContents.forEach(function(file,index) {
		
		// Read in...
		fs.readFile("./test/" + file, function(err,data) {
			if (err) throw err;
			
			console.log("\n\n\n");
			
			// Psych!
			var psy = new Psychic(data);
			var title = psy.getTitle();
			//logTree(psy.parseTree);
			console.log(file + "\t\t" + title + "\n\n\n");
			
			//logTree(psy.parseTree);
			//var docHeading = psy.getDocumentHeading();
			var content = psy.getContent();
			//console.log(content);
			[psy.getContent().shift()].forEach(function(region) {
				console.log("REGION: " + region.node.tagName + " Score was ",region.score);
				//console.log(region.node.getText().replace(/\n\s+/g,"\n\n").replace(/\t/g,"").replace(/\s\s+/g," "));
				logTree(region.node);
				console.log("\n\n\n\n");
			})
		});
	});
});