'use strict';
require('dotenv').config();

let {Tournament, Event, Phase, PhaseGroup} = require('smashgg.js');
let moment = require('moment');

let winston = require('winston');
winston.remove(winston.transports.Console);
winston.add(new winston.transports.Console({
	level: process.env.LOG_LEVEL || 'info',
	json: false
}))

exports.handler = async function(event, context, callback){
	try{
		///////////////////////////////////////////////
		var handle = function(e){
			console.log('uncaught error: %s', e);
            callback(e, null);
            process.exit(1);
		}
		process.on('unhandledRejection', handle);
		process.on('uncaughtException', handle);
		///////////////////////////////////////////////

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
		let d 			 = input.d;
		
		if(d) require('sinon').useFakeTimers(new Date(d));
		console.log('Current Time: %s', moment().format());

		let sets = [];
		switch(type.toLowerCase()){
		case 'tournament':
			console.log('Getting sets %s minmutes back for tournament %s', minutesBack, tournamentId);
			let t = await Tournament.getTournament(tournamentId, {isCached: false});
			console.log('got tournament object, undefined?', t == undefined);
			sets = await t.getSetsXMinutesBack(minutesBack);
			break;
		case 'event':
			console.log('Getting sets %s minutes back for event %s, %s', minutesBack, eventId, tournamentId);
			let e = await Event.getEvent(eventId, tournamentId, {isCached: false});
			console.log('got event object, undefined?', e == undefined);
			sets = await e.getSetsXMinutesBack(minutesBack);
			break;
		case 'phase':
			console.log('Getting sets %s minutes back for phase %s', minutesBack, phaseId);
			let p = await Phase.getPhase(phaseId, {isCached: false});
			console.log('got phase object, undefined?', p == undefined);
			sets = await p.getSetsXMinutesBack(minutesBack);
			break;
		case 'phasegroup':
			console.log('Getting sets %s minutes back for phasegroup %s', minutesBack, groupId);
			let pg = await PhaseGroup.getPhaseGroup(groupId, {isCached: false});
			console.log('got group object, undefined?', pg == undefined);
			sets = await pg.getSetsXMinutesBack(minutesBack);
			break;
		default:
			console.log('Unknown type: %s', type);
			callback(new Error('Unknown type: ' + type), null);
			return false;
		}

		console.log('got sets', sets.length);
		callback(null, sets);
		return true;
	} catch(e){
		console.log('main error: %s', e);
		callback(e, null);
	}
}