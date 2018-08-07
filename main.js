'use strict';
require('dotenv').config();

let helper = require('./lib/aws.helper');
let getSets = require('./lib/getSets');

exports.handler = async function(event, context, callback){
	try{
		process.on('unhandledRejection', function(e){
            console.error(e);
            callback(e, null);
            process.exit(1);
		});

		await helper.init();
		let input = event.body ? event.body : event;
		console.log('input:', input);

		//Parse input
		let type 		 = input.type;
		let tournamentId = input.tournamentId;
		let eventId 	 = input.eventId;
		let minutesBack  = input.minutesBack;

		let sets = [];
		switch(type.toLowerCase()){
		case 'tournament':
			sets = await getSets.getTournamentSets(tournamentId, minutesBack);
			break;
		case 'event':
			sets = await getSets.getEventSets(eventId, tournamentId, minutesBack);
			break;
		default:
			console.error('Unknown type: %s', type);
			callback(new Error('Unknown type: ' + type), null);
			return false;
		}

		callback(null, sets);
		return true;
	} catch(e){
		console.error('main: %s', e);
		callback(e, null);
	}
}