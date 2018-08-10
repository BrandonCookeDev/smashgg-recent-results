'use strict';
require('dotenv').config();

let {Tournament, Event, Phase, PhaseGroup} = require('smashgg.js');
let moment = require('moment');

let winston = require('winston');
winston.remove(winston.transports.Console);
winston.add(new winston.transports.Console({
	level: process.env.LOG_LEVEL || 'info',
	json: false
}));

exports.handler = async function(event, context, callback){
	try{
		///////////////////////////////////////////////
		var handle = function(e){
			console.log('uncaught error: %s', e);
			let ret = formatApiGatewayResponse(500, e.message);
			callback(null, ret);
            process.exit(1);
		}
		process.on('unhandledRejection', handle);
		process.on('uncaughtException', handle);
		///////////////////////////////////////////////

		//await helper.init();
		let input = event.body ? event.body : event;
		console.log('input:', input);

		if(typeof(input) === 'string')
			input = JSON.parse(input);
		
		let isError = validateBody(input);
		if(isError){
			console.error(isError.err);
			let ret = formatApiGatewayResponse(500, isError.err);
			callback(null, ret);
			return false;
		}

		//Parse input
		let type 		 = input.type;
		let minutesBack  = input.amount;
		let concurrency  = input.concurrency;
		let tournamentId = input.tournamentId;
		let eventId 	 = input.eventId;
		let phaseId 	 = input.phaseId;
		let groupId		 = input.phaseGroupId;
		let d 			 = input.d;
		
		if(d) var clock = require('sinon').useFakeTimers(new Date(d));
		console.log('Current Time: %s', moment().format('YYYY-MM-DD HH:mm:ss'));

		let sets = [];
		switch(type.toLowerCase()){
		case 'tournament':
			console.log('Getting sets %s minmutes back for tournament %s', minutesBack, tournamentId);
			let t = await Tournament.getTournament(tournamentId, {isCached: false});
			console.log('got tournament object, undefined?', t == undefined);
			sets = await t.getSetsXMinutesBack(minutesBack, {concurrency: concurrency});
			break;
		case 'event':
			console.log('Getting sets %s minutes back for event %s, %s', minutesBack, eventId, tournamentId);
			let e = await Event.getEvent(eventId, tournamentId, {isCached: false});
			console.log('got event object, undefined?', e == undefined);
			sets = await e.getSetsXMinutesBack(minutesBack, {concurrency: concurrency});
			break;
		case 'phase':
			console.log('Getting sets %s minutes back for phase %s', minutesBack, phaseId);
			let p = await Phase.getPhase(phaseId, {isCached: false});
			console.log('got phase object, undefined?', p == undefined);
			sets = await p.getSetsXMinutesBack(minutesBack, {concurrency: concurrency});
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

		if(d && clock) clock.restore();
		
		console.log('got sets: ', sets.length);
		let ret = formatApiGatewayResponse(200, sets);
		//console.log('returning', ret);
		callback(null, ret);
		return true;
	} catch(e){
		console.log('main error: %s', e);
		let ret = formatApiGatewayResponse(500, e.message);
		callback(null, ret);
	}
}

function formatApiGatewayResponse(code, body){
    let response = {
        statusCode: code,
        headers: {
            "x-custom-header" : "my custom header value",
            "Access-Control-Allow-Origin": "*"
        },
        body: typeof(body) === 'string' ? body : JSON.stringify(body)
    };
    return response;
}


function validateBody(input){
	var type;
	console.log('Validating body: %s %s', typeof(input), JSON.stringify(input));
	console.log('type', input.type);
	if(!input.type)
		return {err: 'type is a required parameter. Accepts (TOURNAMENT|EVENT|PHASE|PHASEGROUP)'};
	else
		type = input.type.toLowerCase();

	if(!input.amount)
		return {err: 'amount is a required parameter. Accepts an Integer for how many minute back to search'};
	
	if(type === 'tournament' && !input.tournamentId)
		return {err: 'type tournament must incluse tournamentId parameter'};
	else if(type === 'tournament' && !isNaN(parseInt(input.tournamentId)))
		return {err: 'tournamentId parameter must be a string tournament slug'};
	
	if(type === 'event' && !input.eventId)
		return {err: 'type event must include eventId parameter'};
	else if(type === 'event' && isNaN(parseInt(input.eventId)) && !input.tournamentId)
		return {err: 'type event with string eventId must include string tournamentId'};
	
	if(type === 'phase' && !input.phaseId)
		return {err: 'type phase must include phaseId parameter'};
	else if(type === 'phase' && isNaN(parseInt(input.phaseId)))
		return {err: 'phaseId parameter must be an integer'};

	if(type === 'phasegroup' && !input.phaseGroupId)
		return {err: 'type phasegroup must include phaseGroupId parameter'};
	else if(type === 'phasegroup' && isNaN(parseInt(input.phaseGroupId)))
		return {err: 'phaseGroupId parameter must be an integer'};

	if(input.d && isNaN(new Date(input.d).getMonth()))
		return {err: 'manual date must be parsable to Date object'};

	console.log('Validated!');
	return false;
}