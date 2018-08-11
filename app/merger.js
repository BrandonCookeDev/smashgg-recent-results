'use strict';
require('dotenv').config();

let fs = require('fs');
let path = require('path');
let handlebars = require('handlebars');

let FILE = path.join(__dirname, '../dist/smashggRecentResults.template.js');
let FILE_CONTENT = fs.readFileSync(FILE, 'utf8');

let newContent = handlebars.compile(FILE_CONTENT)(process.env);
let NEW_FILE = path.join(__dirname, '../dist/smashggRecentResults.js');
fs.writeFileSync(NEW_FILE, 'utf8');