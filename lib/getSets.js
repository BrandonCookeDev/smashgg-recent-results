'use strict';

let moment = require('moment');
let {Tournament,Event,Set} = require('smashgg.js');

function calculateRecentSets(sets, minutesBack){
	try{
		let now = moment();
		let then = moment().subtract(minutesBack, 'minutes');

		//let duration = moment.duration(now.diff(then)).humanize();
		
		let filtered = sets.filter(function(set){
			
		})

	} catch(e){
		console.error(e);
		throw e;
	}
}

exports.getTournamentSets = async function(tournamentName, minutesBack){
	try{
		let tournament = await Tournament.getTournament(tournamentName);
		let sets =  await tournament.getIncompleteSets();
		
		// Pull Sets previously cached
		

		// Cache (store) incomplete sets


		// calculate what sets completed in the last (minutesBack) minutes
		let remainingSets = calculateRecentSets(sets, minutesBack);
		 
	} catch(e){
		console.error(e);
		throw e;
	}
}

exports.getEventSets = async function(eventName, tournamentName, minutesBack){
	try{
		let event = await Event.getEvent(eventName, tournamentName);
		let sets = await event.getIncompleteSets();

		let remainingSets = calculateRecentSets(sets, minutesBack);

	} catch(e){
		console.error(e);
		throw e;
	}
}