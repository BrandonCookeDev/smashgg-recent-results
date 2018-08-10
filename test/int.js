'use strict';
require('dotenv').config();

let request = require('request-promise');
let url = process.env.API_URL;

(async function(){
	try{
		let params = {
			type: 'event',
			amount: 5,
			concurrency: 4,
			tournamentId: 'to12',
			eventId: 'melee-singles',
			d: '2017-11-11 13:00:00'
		};

		let options = {
			uri: url,
			method: 'POST',
			body: JSON.stringify(params)
		};

		console.log(options);
		let resp = await request(options);
		console.log(resp);
	} catch(e){
		console.error(e);
		process.exit(1);
	}
})()