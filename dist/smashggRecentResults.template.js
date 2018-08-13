'use strict';

//import moment from './lib/moment';
//import smashgg from './lib/smashgg-promise';
//import firebase from './lib/firebase';


var stale = {};
var completed = {};
var incomplete = {};

var STALE_CEILING = 5;
var GROOM_INTERVAL;

// Initialize Firebase
// TODO: Replace with your project's customized code snippet
var config = {
	apiKey: "{{firebaseKey}}",
	authDomain: "{{fireabseAuthDomain}}",
	databaseURL: "{{firebaseUrl}}",
	projectId: "{{firebaseProjectId}}"
};
firebase.initializeApp(config);
let database = firebase.database();

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
	let checkPeriod = options.checkPeriod; //default null
	let tournamentId = options.tournamentId;
	let eventId = options.eventId;
	let phaseId = options.phaseId;
	let groupId = options.groupId;

	STALE_CEILING = amount;

	reset();

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

	// Controls the automatic grooming of Incomplete, Completed, 
	// and Stale set sorting. Set checkPeriod to null to deactivate
	if(!GROOM_INTERVAL && checkPeriod){
		GROOM_INTERVAL = setInterval(() => {
			groomCompleted();
			groomIncomplete();
			groomStale();
		}, checkPeriod)
	}
	else if(GROOM_INTERVAL)
		clearInterval(GROOM_INTERVAL);
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
		let thisSet = database.ref('/tournament/set/' + id).orderByKey();
		thisSet.on('value', smashggSetCallback);
	})
	return ids;
}

function smashggSetCallback(snapshot){
	let val = snapshot.val();
	let set = val.entities.sets;
	sort(set);
}

function sort(set){
	let completedAt = set.completedAt;
	if(completedAt){
		if(isStale(completedAt))
			addToStale(set);
		else
			addToCompleted(set);
	}
	else
		addToIncomplete(set);
}

function addToCompleted(set){
	let id = set.id;
	if(completed.hasOwnProperty(id)) 
		return;

	completed[id] = set;	
	
	if(incomplete.hasOwnProperty(id))
		delete incomplete[id];
	else if(stale.hasOwnProperty(id))
		delete stale[id];
}

function addToIncomplete(set){
	let id = set.id;
	if(incomplete.hasOwnProperty(id))
		return;

	incomplete[id] = set;
	
	if(completed.hasOwnProperty(id))
		delete completed[id];
	else if(stale.hasOwnProperty(id))
		delete stale[id];
}

function addToStale(set){
	let id = set.id;
	if(stale.hasOwnProperty(id))
		return;	
	stale[id] = set;
	
	if(completed.hasOwnProperty(id))
		delete completed[id];
	else if(incomplete.hasOwnProperty[id])
		delete incomplete[id];
}

/** TIME CALCULATION */
function isStale(timestamp){
	let now = moment();
	let then = moment.unix(timestamp);
	let diff = moment.duration(now.diff(then));

	if(diff.years() > 0 || diff.months() > 0 || 
		diff.days() > 0 || diff.hours() > 0)
		return true;

	if(diff.minutes() >= STALE_CEILING)
		return true;
	else
		return false	
}

/** SET STORAGE */
function groomCompleted(){
	for(let id in completed){
		let set = completed[id];
		sort(set);
	}
}

function groomIncomplete(){
	for(let id in incomplete){
		let set = incomplete[id];
		sort(set);
	}
}

function groomStale(){
	for(let id in stale){
		let set = stale[id];
		sort(set);
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

function reset(){
	
	for(var id in incomplete){
		let thisSet = database.ref('/tournament/set/' + id).orderByKey();
		thisSet.off();
	}

	for(var id in completed){
		let thisSet = database.ref('/tournament/set/' + id).orderByKey();
		thisSet.off();
	}

	for(var id in stale){
		let thisSet = database.ref('/tournament/set/' + id).orderByKey();
		thisSet.off();
	}

	incomplete = {};
	completed = {};
	stale = {};
}

document.getElementById('typeText').value = 'event';
document.getElementById('tournamentIdText').value = 'liva-s-api-test-do-not-mind-me';
document.getElementById('eventIdText').value = 'melee-singles';
//getEventSetIds('melee-singles', 'ceo-2016').then(console.log);