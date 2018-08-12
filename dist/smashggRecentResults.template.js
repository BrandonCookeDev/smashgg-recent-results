'use strict';

//import moment from './lib/moment';
//import smashgg from './lib/smashgg-promise';
//import firebase from './lib/firebase';

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

function run(){
	let type = document.getElementById('typeText').value;
	let tournamentId = document.getElementById('tournamentIdText').value;
	let eventId = document.getElementById('eventIdText').value;
	let phaseId = document.getElementById('phaseIdText').value;
	let groupId = document.getElementById('groupIdText').value;

	let options = {
		type: type,
		tournamentId: tournamentId,
		eventId: eventId,
		phaseId: phaseId,
		groupId: groupId
	}
	
	init(options);
}

function init(options){
	// parse options
	let type = options.type || '';
	let amount = options.amount || 5;
	let checkPeriod = options.checkPeriod || 120000; //default 2 minutes
	let tournamentId = options.tournamentId;
	let eventId = options.eventId;
	let phaseId = options.phaseId;
	let groupId = options.groupId;

	STALE_CEILING = amount;

	// one time call to db to get all sets from Tournament-X
	let setIdsPromise;
	switch(type.toLowerCase()){
	case 'tournament':
		setIdsPromise = getTournamentSetIds(tournamentId);
		break;
	case 'event':
		setIdsPromise = getEventSetIds(eventId, tournamentId);
		break;
	case 'phase':
		setIdsPromise = getPhaseSetIds(phaseId);
		break;
	case 'phasegroup':
		setIdsPromise = getPhaseGroupSetIds(groupId);
		break;
	default: 
		console.error('type may only be (TOURNAMENT|EVENT|PHASE|PHASEGROUP)');
		return;
	}

	setIdsPromise
		.then(storeSetsInCache)
		.then(setCallbackFunctions)
		.catch(console.error);

	setInterval(function(){
		moveStaleCompletedSets();
		moveCompletedNonStaleSets();
		moveStaleBackToCompleted();
	}, checkPeriod);
}

/** SET FIREBASE EVENT HANDLING **/
function storeSetsInCache(ids){
	ids.forEach(id => {
		incomplete[id] = {};
	})
	return ids;
}

function setCallbackFunctions(ids){
	ids.forEach(id => {
		let thisSet = firebase.database().ref('/tournament/set/' + id);
		thisSet.on('value', smashggSetCallback);
	})
	return ids;
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
		let then = moment.unix(set.completedAt);
		let diff = moment.duration(now.diff(then));

		if(diff.minutes() < STALE_CEILING){
			complete[id] = set;
			delete stale[id];
		}
	}
}

/** SET COLLECTION **/
function getTournamentSetId(tournamentId){
	if(!tournamentId) {
		console.error('type Tournament must include a tournamentId');
		return;
	}
	return smashgg.getTournament(tournamentId)
		.then(tourney => { return tourney.getAllMatcheIds(); })
		.catch(console.error);
}

function getEventSetIds(eventId, tournamentId){
	if(!eventId){
		console.error('type event must include an eventId');
		return;
	}
	else if(isNaN(eventId) && !tournamentId){
		console.error('type event must have tournament slug if event slug is included');
		return;
	}

	return smashgg.getEvent(tournamentId, eventId)
		.then(event => { return event.getEventMatchIds(); })
		.catch(console.error);
}

function getPhaseSetIds(phaseId){
	if(!phaseId){
		console.error('type phase must include a phaseId');
		return;
	}

	return smashgg.getPhase(phaseId)
		.then(phase => { return phase.getPhaseMatchIds(); })
		.catch(console.error);
}

function getPhaseGroupSetIds(groupId){
	if(!groupId){
		console.error('type phasegroup must include a groupId');
		return;
	}

	return smashgg.getPhaseGroup(groupId)
		.then(group => { return group.getMatchIds(); })
		.catch(console.error);
}

document.getElementById('typeText').value = 'event';
document.getElementById('tournamentIdText').value = 'ceo-2016';
document.getElementById('eventIdText').value = 'melee-singles';
//getEventSetIds('melee-singles', 'ceo-2016').then(console.log);