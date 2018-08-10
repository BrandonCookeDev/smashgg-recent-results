'use strict';
require('dotenv').config();
require('../server');

let request = require('request-promise');

setTimeout(
	async function(){
		try{
			let params = {
				type: 'PHASE',
				phaseId: '124019',
				eventId: 'melee-singles',
				amount: 20,
				concurrency: 20,
				tournamentId: 'heir-4',
				d: "2017-07-08 13:00:00"
			};
			
			let options = {
				uri: 'http://localhost:8081/recent-results',
				method: 'POST',
				body: JSON.stringify(params)
			}

			console.log(options);
			let resp = await request(options);
			console.log(resp);
			process.exit(0);
		} catch(e){
			console.error(e);
			process.exit(1);
		}
	},
2000);

/*
$.ajax({
  url:"https://localhost:8081/recent-results",
  method :"POST",
  data: JSON.stringify({
    type: 'PHASE',
    phaseId: '124019',
    eventId: 'melee-singles',
    amount: 20,
    concurrency: 20,
    tournamentId: 'heir-4',
    d: "2017-07-08 13:00:00"
  })
})
.done(data => {
  console.log(data);
  document.getElementById('test').innerHTML = JSON.stringify(data)
});
*/