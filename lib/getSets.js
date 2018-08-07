'use strict';

let _ = require('lodash');
let pmap = require('p-map');
let moment = require('moment');
let helper = require('./aws.helper');
let {Tournament,Event,Set} = require('smashgg.js');


function calculateRecentlyCompletedSets(sets, minutesBack){
	try{
		let now = moment();
		let filtered = sets.filter(set => {
			let then = moment(set.entryTime);
			let diff = moment.duration(now.diff(then)).minutes();
			return diff <= minutesBack;
		});
		return filtered;
	} catch(e){
		console.error(e);
		throw e;
	}
}

async function cacheSets(sets){	
	let fn = async function(set){
		let key = set.id
		set.entryTime = moment();
		await helper.set(key, set); // TODO ttl
		return true;
	}
	await pmap(sets, fn, {concurrency: 4});
	return true;
}

async function fetchSets(sets){
	let fn = async function(set){
		return await Set.getSet(set.id);
	}
	let updated = await pmap(sets, fn, {concurrency: 4});
	return updated;
}

async function processSets(sets, minutesBack){
	// Pull Sets previously cached and determine which
	//  are completed now but polling smashgg with set ids
	let completed = incompleted = [];
	let cached = await helper.getAll();
	let updatedCachedSets = fetchSets(cached);
	updatedCachedSets.forEach(set => {
		if(set.getIsComplete()) completed.push(set);
		else incompleted.push(set);
	});

	// Cache incomplete sets
	// This should automatically update cached in-progress
	//  for the cache key is the set id. Should override.
	await cacheSets(sets);

	// Calculate what sets completed in the last (minutesBack) minutes
	let remainingSets = calculateRecentlyCompletedSets(completed, minutesBack);
	return remainingSets;
}

exports.getTournamentSets = async function(tournamentName, minutesBack){
	try{
		let tournament = await Tournament.getTournament(tournamentName);
		let sets =  await tournament.getIncompleteSets();
		let filtered = await processSets(sets, minutesBack);
		return filtered;
	} catch(e){
		console.error(e);
		throw e;
	}
}

exports.getEventSets = async function(eventName, tournamentName, minutesBack){
	try{
		let event = await Event.getEvent(eventName, tournamentName);
		let sets = await event.getIncompleteSets();
		let filtered = await processSets(sets, minutesBack);
		return filtered;
	} catch(e){
		console.error(e);
		throw e;
	}
}