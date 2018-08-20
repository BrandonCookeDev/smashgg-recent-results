'use strict';

let inquirer = require('inquirer');
let merger = require('./merger');

inquirer
	.prompt([
		{
			type: 'input',
			name: 'firebaseKey',
			message: 'Firebase Key?'
		},
		{
			type: 'input',
			name: 'fireabseAuthDomain',
			message: 'Firebase Auth Domain?'
		},
		{
			type: 'input',
			name: 'firebaseUrl',
			message: 'Firebase URL?'
		},
		{
			type: 'input',
			name: 'firebaseProjectId',
			message: 'Firebase Project ID'
		},
		{
			type: 'input',
			name: 'firebaseDbPath',
			message: 'Path to data in the database'
		}
	])
	.then(merger)
	.catch(console.error);