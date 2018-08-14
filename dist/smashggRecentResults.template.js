'use strict';

let ggResults = new Object();

//import moment from './lib/moment';
//import smashgg from './lib/smashgg-promise';
//import firebase from './lib/firebase';

ggResults.stale = {};
ggResults.completed = {};
ggResults.incomplete = {};
ggResults.players = {};

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

function runRecentResultsQueryFromForm(){
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
		.then((ids) => { 
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

			return ids;
		})
		.then(ids => { return Promise.resolve(ids); })
		.catch(console.error);

	
}

/** SET FIREBASE EVENT HANDLING **/
function storeSetsInCache(ids){
	ids.forEach(id => {
		ggResults.incomplete[id] = {};
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

	let playerIds = [set.entrant1Id, set.entrant2Id];
	playerIds.forEach(id => {
		if(!id) return;
		let thisPlayer = database.ref('/tournament/player/' + id).orderByKey();
		thisPlayer.on('value', snapshot => {
			let player = snapshot.val();
			ggResults.players[player.id] = player;
 		})
	})
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
	if(ggResults.completed.hasOwnProperty(id)) 
		return;

	ggResults.completed[id] = set;	
	
	if(ggResults.incomplete.hasOwnProperty(id))
		delete ggResults.incomplete[id];
	else if(ggResults.stale.hasOwnProperty(id))
		delete ggResults.stale[id];
}

function addToIncomplete(set){
	let id = set.id;
	if(ggResults.incomplete.hasOwnProperty(id))
		return;

	ggResults.incomplete[id] = set;
	
	if(ggResults.completed.hasOwnProperty(id))
		delete ggResults.completed[id];
	else if(ggResults.stale.hasOwnProperty(id))
		delete ggResults.stale[id];
}

function addToStale(set){
	let id = set.id;
	if(ggResults.stale.hasOwnProperty(id))
		return;	
	ggResults.stale[id] = set;
	
	if(ggResults.completed.hasOwnProperty(id))
		delete ggResults.completed[id];
	else if(ggResults.incomplete.hasOwnProperty[id])
		delete ggResults.incomplete[id];
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
	for(let id in ggResults.completed){
		let set = ggResults.completed[id];
		sort(set);
	}
}

function groomIncomplete(){
	for(let id in ggResults.incomplete){
		let set = ggResults.incomplete[id];
		sort(set);
	}
}

function groomStale(){
	for(let id in ggResults.stale){
		let set = ggResults.stale[id];
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
	
	for(var id in ggResults.incomplete){
		let thisSet = database.ref('/tournament/set/' + id).orderByKey();
		thisSet.off();
	}

	for(var id in ggResults.completed){
		let thisSet = database.ref('/tournament/set/' + id).orderByKey();
		thisSet.off();
	}

	for(var id in ggResults.stale){
		let thisSet = database.ref('/tournament/set/' + id).orderByKey();
		thisSet.off();
	}

	ggResults.incomplete = {};
	ggResults.completed = {};
	ggResults.stale = {};
	ggResults.player = {};
}

function getCompleted(){
	return Object.values(ggResults.completed);
}
function getIncomplete(){
	return Object.values(ggResults.incomplete);
}
function getStale(){
	return Object.values(ggResults.stale);
}

ggResults.getRecentResults = init;
ggResults.getCompleted = getCompleted;
ggResults.getIncomplete = getIncomplete;
ggResults.getStale = getStale;

module.exports = ggResults;