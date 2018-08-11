'use strict';

const path = require('path');
require('../app/merger');

let express = require('express');
let app = express();

app.use(express.static(__dirname));
console.log(__dirname);

app.listen(8081, function(err){
	if(err){
		console.error(err);
		return;
	}
	console.log('Server listening on port 8081');
})