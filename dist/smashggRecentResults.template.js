'use strict';

import moment from '../lib/moment';
import smashgg from '../lib/smashgg-promise';
import firebase from '../lib/firebase';

var stale = {};
var completed = {};
var incomplete = {};

var STALE_CEILING = 5;

// Initialize Firebase
// TODO: Replace with your project's customized code snippet
var config = {
	apiKey: "{{firebaseKey}}",
	authDomain: "{{fireabseAuthDomain}}",
	databaseURL: "{{firebaseUrl}}",
	projectId: "{{firebaseProjectId}}"
};
firebase.initializeApp(config);


function init(options){
	// parse options
	let type = options.type || '';
	let amount = options.amount;
	let checkPeriod = options.checkPeriod || 120000; //default 2 minutes
	let tournamentId = options.tournamentId;
	let eventId = options.eventId;
	let phaseId = options.phaseId;
	let groupId = options.groupId;

	STALE_CEILING = amount;

	// one time call to db to get all sets from Tournament-X
	let setsPromise;
	switch(type.toLowerCase()){
	case 'tournament':
		setsPromise = getTournamentSets;
		break;
	case 'event':
		setsPromise = getEventSets;
		break;
	case 'phase':
		setsPromise = getPhaseSets;
		break;
	case 'phasegroup':
		setsPromise = getPhaseGroupSets;
		break;
	default: 
		console.error('type may only be (TOURNAMENT|EVENT|PHASE|PHASEGROUP)');
		return;
	}

	setsPromise()
		.then(storeSetsInCache)
		.then(setCallbackFunctions)
		.catch(console.error);
}

/** SET FIREBASE EVENT HANDLING **/
function storeSetsInCache(sets){
	sets.forEach(set => {
		incomplete[set.getId()] = set;
	})
	return sets;
}

function setCallbackFunctions(sets){
	sets.forEach(set => {
		let thisSet = firebase.database().ref('/tournament/set/' + set.id);
		thisSet.on('value', smashggSetCallback);
	})
	return sets;
}

function smashggSetCallback(snapshot){
	let val = snapshot.val();

	let set = val.entities.sets;
	let id = set.id;
	let completedAt = set.completedAt;

	if(completed.hasOwnProperty(id))
		return;
	else if(completedAt){
		let now = moment();
		let then = moment.unix(completedAt);
		let diff = moment.duration(now.diff(then));

		if(diff.minutes() >= STALE_CEILING)
			stale[id] = set;
		else
			completed[id] = set;	
	}
	else
		incomplete[id] = set;
}

/** SET STORAGE */
function moveStaleCompletedSets(){
	let now = moment();
	for(let id in completed){
		let set = completed[id];
		let completedAt = set.entities.sets.completedAt;
		if(!completedAt) continue;

		let then = moment.unix(completedAt);
		let diff = moment.duration(now.diff(then));

		if(diff.minutes() < 0){
			stale[id] = set;
			delete completed[id];
		}
	}
}

function moveCompletedNonStaleSets(){
	let now = moment();
	for(let id in completed){
		let set = completed[id];
		let completedAt = set.entities.sets.completedAt;
		if(!completedAt) continue;

		let then = moment.unix(completedAt);
		let diff = moment.duration(now.diff(then));

		if(diff.minutes() >= 0 && diff.minutes() < STALE_CEILING){
			complete[id] = set;
			delete incomplete[id];
		}
		else if(diff.minutes() > STALE_CEILING){
			stale[id] = set;
			delete incomplete[id];
		}
	}
}

function moveStaleBackToCompleted(){
	let now = moment();
	for(let id in stale){
		let set = stale[id];

	}
}

/** SET COLLECTION **/
function getTournamentSets(tournamentId){
	if(!tournamentId) {
		console.error('type Tournament must include a tournamentId');
		return;
	}
	return smashgg.getTournament(tournamentId)
		.then(tourney => {
			return tourney.getAllMatches();
		})
		.catch(console.error);
}

function getEventSets(eventId, tournamentId){
	if(!eventId){
		console.error('type event must include an eventId');
		return;
	}
	else if(isNaN(eventId) && !tournamentId){
		console.error('type event must have tournament slug if event slug is included');
		return;
	}

	return smashgg.getEvent(eventId, tournamentId)
		.then(event => { 
			return event.getEventPhaseGroups()
		})
		.then(groups => {
			let promises = groups.map(group => {
				return group.getMatches();
			})
		})
		.catch(console.error);
}

function getPhaseSets(phaseId){
	if(!phaseId){
		console.error('type phase must include a phaseId');
		return;
	}

	return smashgg.getPhase(phaseId)
		.then(phase => {
			return phase.getPhaseSets()
		})
		.catch(console.error);
}

function getPhaseGroupSets(groupId){
	if(!groupId){
		console.error('type phasegroup must include a groupId');
		return;
	}

	return smashgg.getPhaseGroup(groupId)
		.then(group => { 
			return group.getMatches();
		})
		.catch(console.error);
}