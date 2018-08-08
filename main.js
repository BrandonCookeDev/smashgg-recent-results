'use strict';
require('dotenv').config();

//let helper = require('./lib/aws.helper');
//let getSets = require('./lib/getSets');
let {Tournament, Event, Phase, PhaseGroup} = require('smashgg.js');
 
exports.handler = async function(event, context, callback){
	try{
		process.on('unhandledRejection', function(e){
            console.error(e);
            callback(e, null);
            process.exit(1);
		});

		//await helper.init();
		let input = event.body ? event.body : event;
		console.log('input:', input);

		//Parse input
		let type 		 = input.type;
		let minutesBack  = input.amount;
		let tournamentId = input.tournamentId;
		let eventId 	 = input.eventId;
		let phaseId 	 = input.phaseId;
		let groupId		 = input.phaseGroupId;

		let sets = [];
		switch(type.toLowerCase()){
		case 'tournament':
			let t = await Tournament.getTournament(tournamentId, {isCached: false});
			sets = await t.getSetsXMinutesBack(minutesBack);
			break;
		case 'event':
			let e = await Event.getEvent(eventId, tournamentId, {isCached: false});
			sets = await e.getSetsXMinutesBack(minutesBack);
			break;
		case 'phase':
			let p = await Phase.getPhase(phaseId, {isCached: false});
			sets = await p.getSetsXMinutesBack(minutesBack);
			break;
		case 'phasegroup':
			let pg = await PhaseGroup.getPhaseGroup(groupId, {isCached: false});
			sets = await pg.getSetsXMinutesBack(minutesBack);
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