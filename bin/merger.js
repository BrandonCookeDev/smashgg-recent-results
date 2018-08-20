'use strict';

module.exports = function(input){
	const path = require('path');
	//require('dotenv').config({path: path.join(__dirname, '../.env')});
	//console.log(process.env);

	const DESTINATION = path.join(__dirname, '../dist');

	let fs = require('fs');
	let handlebars = require('handlebars');

	let FILE = path.join(__dirname, '../dist/ggResults.template.js');
	let FILE_CONTENT = fs.readFileSync(FILE, 'utf8');

	let newContent = handlebars.compile(FILE_CONTENT)(input);
	let NEW_FILE = path.join(DESTINATION, 'ggResults.js');
	fs.writeFileSync(NEW_FILE, newContent, 'utf8');
}