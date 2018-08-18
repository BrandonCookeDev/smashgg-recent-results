'use strict';

let ggResults = new Object();

//import { moment } from './lib/moment';
//import { smashgg } from './lib/smashgg-promise';
//import { firebase } from './lib/firebase';

if(!moment) console.error('Missing moment.js import [ggResults dependency]');
if(!smashgg) console.error('Missing smashgg-promise import [ggResults dependency]');
if(!firebase) console.error('Missing firebase import [ggResutls dependency]');

ggResults.stale = {};
ggResults.completed = {};
ggResults.incomplete = {};
ggResults.phaseGroups = {};
ggResults.players = {};

var STALE_CEILING = 5;
var GROOM_INTERVAL;
var CALLBACK;

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

class Bucket extends Object{

	constructor(label){
		this.label = label;
		this.bucket = {};
	}

	add(index, element){
		this[index] = element;
	}

	remove(index){
		if(this.hasOwnProperty(index))
			delete this[index]
		//else console.warn(index + ' is not an index in the Bucket: ' + this.label);
	}

	get(index){
		return this[index];
	}

	exists(index){
		return this.hasOwnProperty(index);
	}

	keys(){
		return Object.keys(this);
	}

	toArray(){
		return Object.values(this);
	}

	static addToAll(index, value, buckets){
		buckets.forEach(bucket => {
			bucket.add(index, value);
		})
	}

	static removeFromAll(index, buckets){
		buckets.forEach(bucket => {
			bucket.remove(index);	
		})
	}

}

class SortingHat{

		SortingHat.StaleCeiling = 5;

	static setStaleCeiling(ceiling){
		SortingHat.StaleCeiling = ceiling;
	}

	static getStaleBucket(){
		if(!SetAggregator.StaleBucket){
			SetAggregator.StaleBucket = new Bucket('STALE');
		}
		return SetAggregator.StaleBucket;
	}

	static getFreshBucket(){
		if(!SetAggregator.FreshBucket){
			SetAggregator.FreshBucket = new Bucket('FRESH');
		}
		return SetAggregator.FreshBucket;
	}

	static getIncompleteBucket(){
		if(!SetAggregator.IncompleteBucket){
			SetAggregator.IncompleteBucket = new Bucket('INCOMPLETE');
		}
		return SetAggregator.IncompleteBucket;
	}

	static sort(set){
		let completedAt = set.completedAt;
		if(completedAt){
			if(isStale(completedAt))
				SortingHat.addToStale(set);
			else
				SortingHat.addToFresh(set);
		}
		else
			SortingHat.addToIncomplete(set);
	}

	static isStale(timestamp, ceiling){
		let now = moment();
		let then = moment.unix(timestamp);
		let diff = moment.duration(now.diff(then));

		if(diff.years() > 0 || diff.months() > 0 || 
			diff.days() > 0 || diff.hours() > 0)
			return true;

		if(diff.minutes() >= (ceiling || 5))
			return true;
		else
			return false	
	}

	static groomCompleted(){
		for(let id in SortingHat.getFreshBucket().keys()){
			let set = SortingHat.getFreshBucket().get(id);
			sort(set);
		}
	}

	static groomIncomplete(){
		for(let id in SortingHat.getIncompleteBucket().keys()){
			let set = SortingHat.getIncompleteBucket().get(id);
			sort(set);
		}
	}

	static groomStale(){
		for(let id in SortingHat.getStaleBucket().keys()){
			let set = SortingHat.getStaleBucket().get(id);
			sort(set);
		}
	}

	static addToFresh(set){
		let id = set.id;
		if(SortingHat.getFreshBucket().exists(id)) 
			return;
		SortingHat.getFreshBucket().add(id, set);	
		
		let otherBuckets = [
			SortingHat.getIncompleteBucket(),
			SortingHat.getStaleBucket()
		]
		Bucket.removeFromAll(id, otherBuckets);
	}

	static addToIncomplete(set){
		let id = set.id;
		if(SortingHat.getIncompleteBucket().exists(id)) 
			return;

		SortingHat.getIncompleteBucket().add(id, set);	
		
		let otherBuckets = [
			SortingHat.getFreshBucket(),
			SortingHat.getStaleBucket()
		]
		Bucket.removeFromAll(id, otherBuckets);
	}

	static addToStale(set){
		let id = set.id;
		if(SortingHat.getStaleBucket().exists(id)) 
			return;

		SortingHat.getStaleBucket().add(id, set);	
		
		let otherBuckets = [
			SortingHat.getFreshBucket(),
			SortingHat.getIncompleteBucket()
		]
		Bucket.removeFromAll(id, otherBuckets);
	}

}

class SetAggregator{

	constructor(type, tournamentId, eventId, phaseId, groupId){
		this.type = type;
		this.tournamentId = tournamentId;
		this.eventId = eventId;
		this.phaseId = phaseId;
		this.groupId = groupId;
	}

	getIds(){
		let setIdsPromise;
		switch(this.type.toLowerCase()){
		case 'tournament':
			setIdsPromise = SetAggregator.getTournamentSetIds(this.tournamentId);
			break;
		case 'event':
			setIdsPromise = SetAggregator.getEventSetIds(this.eventId, this.tournamentId);
			break;
		case 'phase':
			setIdsPromise = SetAggregator.getPhaseSetIds(this.phaseId);
			break;
		case 'phasegroup':
			setIdsPromise = SetAggregator.getPhaseGroupSetIds(this.groupId);
			break;
		default: 
			console.error('type may only be (TOURNAMENT|EVENT|PHASE|PHASEGROUP)');
			return;
		}

		return setIdsPromise;
	}

	getSets(cb){
		this.getIds()
			.then(ids => { return SetAggregator.setCallbackFunctions(ids, cb); })
			.catch(e => {
				console.error(e);
				cb(e, null);
			})
	}	

	static getPlayersBucket(){
		if(!SetAggregator.PlayersBucket){
			SetAggregator.PlayersBucket = new Bucket('PLAYERS');
		}
		return SetAggregator.PlayersBucket;
	}

	static getPhaseGroupBucket(){
		if(!SetAggregator.PhaseGroupBucket){
			SetAggregator.PhaseGroupBucket = new Bucket('PHASEGROUP');
		}
		return SetAggregator.PhaseGroupBucket;
	}


	static setCallbackFunctions(ids, cb) {
		ids.forEach(id => {
			let thisSet = database.ref('/tournament/set/' + id).orderByKey();
			thisSet.on('value', snapshot => {
				let val = snapshot.val();
				let set = val.entities.sets;

				SetAggregator.getPlayersForPhaseGroup(set.phaseGroupId)
					.then(players => { 
						players.forEach(player => {
							SetAggregator.getPlayersBucket().add(player.participantId, player);
						})
					})
					.then(() => {
						let player1 = SetAggregator.getPlayersBucket().get(set.entrant1Id);
						let player2 = SetAggregator.getPlayersBucket().get(set.entrant2Id);
						set.entrant1 = player1;
						set.entrant2 = player2;
						cb(null, set);
					});
					.catch(err => {
						console.error(err);
						cb(err);
					});
			});
		})
		return ids;
	}


	// Smashgg Logic
	static getTournamentSetIds(tournamentId){
		if(!tournamentId) {
			console.error('type Tournament must include a tournamentId');
			return;
		}
		return smashgg.getTournament(tournamentId)
			.then(tourney => { return tourney.getAllMatchIds(); })
			.catch(console.error);
	}

	static getEventSetIds(eventId, tournamentId){
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

	static getPhaseSetIds(phaseId){
		if(!phaseId){
			console.error('type phase must include a phaseId');
			return;
		}

		return smashgg.getPhase(phaseId)
			.then(phase => { return phase.getPhaseMatchIds(); })
			.catch(console.error);
	}

	static getPhaseGroupSetIds(groupId){
		if(!groupId){
			console.error('type phasegroup must include a groupId');
			return;
		}

		return smashgg.getPhaseGroup(groupId)
			.then(group => { return group.getMatchIds(); })
			.catch(console.error);
	}

	static getPlayersForPhaseGroup(groupId){
		if(SetAggregator.getPhaseGroupBucket.exists(groupId)) 
			return Promise.resolve(SetAggregator.getPhaseGroupBucket().get(groupId));

		return smashgg.getPhaseGroup(groupId)
			.then(group => { 
				SetAggregator.getPhaseGroupBucket().add(groupId, group);
				return group.getPlayers();
			})
			.catch(console.error);
	}

	static getPlayers(){
		let ids = Object.values(arguments);
		ids.forEach(id => { 
			if(!id || SetAggregator.getPlayersBucket.exists(id))
				ids.splice(ids.indexOf(id), 1)
		})

		return smashgg.getPlayers(ids)
			.then(players => {
				players.forEach(player => { 
					SetAggregator.getPlayersBucket(player.id, player);
				})
				return players;
			})
			.catch(console.error);
	}

}


class Groomer{

	static getInstance(){
		if(!Groomer.instance)
			Groomer.instance = new Groomer();
		return Groomer.instance;
	}

	constructor(checkPeriod){
		this.checkPeriod = checkPeriod;
		this.interval = null;
	}

	groom(){
		SortingHat.groomCompleted();
		SortingHat.groomIncomplete();
		SortingHat.groomStale();
	}

	clear(){
		if(this.interval)
			clearInterval(this.interval);
	}

	set(ms){
		if(this.interval)
			clearInterval(this.interval);

		this.interval = setInterval(this.groom, ms || 60000)
	}

}

ggResults.SetAggregator = SetAggregator;
ggResults.SortingHat = SortingHat;
ggResults.Groomer = Groomer;
ggResults.Bucket = Bucket;

module.exports = ggResults;

/*


function setStaleCeiling(newCeiling, checkPeriod){
	STALE_CEILING = newCeiling;
	if(GROOM_INTERVAL)
		clearInterval(GROOM_INTERVAL);
	
	let thisCheckPeriod = isNaN(checkPeriod) ? null : parseInt(checkPeriod);
}

function init(options){
	// parse options
	let type = options.type || '';
	let amount = isNaN(options.amount) ? 5 : parseInt(options.amount);
	let checkPeriod = isNaN(options.checkPeriod) ? null : parseInt(options.checkPeriod); //default null
	let tournamentId = options.tournamentId;
	let eventId = options.eventId;
	let phaseId = options.phaseId;
	let groupId = options.groupId;
	let callback = options.callback;
	let resetFlag = options.reset != undefined ? reset.toString() == 'true' : true;

	CALLBACK = callback;
	STALE_CEILING = amount;
	if(resetFlag) reset();

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


	return setIdsPromise
		.then(storeSetsInCache)
		.then(setCallbackFunctions)
		.then((ids) => { 
			// Controls the automatic grooming of Incomplete, Completed, 
			// and Stale set sorting. Set checkPeriod to null to deactivate
			Groomer.getInstance().clear();
			if(checkPeriod){
				Groomer.getInstance().set(checkPeriod);

			}
		})
		.then(ids => { return Promise.resolve(ids); })
		.catch(console.error);

	
}

function storeSetsInCache(ids){
	ids.forEach(id => {
		ggResults.incomplete[id] = {};
	})
	return ids;
}

function setCallbackFunctions(ids){
	let cb = CALLBACK || smashggSetCallback;
	ids.forEach(id => {
		let thisSet = database.ref('/tournament/set/' + id).orderByKey();
		thisSet.on('value', cb);
	})
	return ids;
}

function smashggSetCallback(snapshot){
	let val = snapshot.val();
	let set = val.entities.sets;
	sort(set);
	
	getPlayersForPhaseGroup(set.phaseGroupId)
		.then(players => { 
			players.forEach(player => {
				ggResults.players[player.participantId] = player;
			})
		})
		.catch(console.error);
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
	if(ggResults.stale.hasOwnProperty(id))
		delete ggResults.stale[id];
}

function addToIncomplete(set){
	let id = set.id;
	if(ggResults.incomplete.hasOwnProperty(id))
		return;

	ggResults.incomplete[id] = set;
	
	if(ggResults.completed.hasOwnProperty(id))
		delete ggResults.completed[id];
	if(ggResults.stale.hasOwnProperty(id))
		delete ggResults.stale[id];
}

function addToStale(set){
	let id = set.id;
	if(ggResults.stale.hasOwnProperty(id))
		return;	
	ggResults.stale[id] = set;
	
	if(ggResults.completed.hasOwnProperty(id))
		delete ggResults.completed[id];
	if(ggResults.incomplete.hasOwnProperty[id])
		delete ggResults.incomplete[id];
}

function isStale(timestamp, ceiling){
	let now = moment();
	let then = moment.unix(timestamp);
	let diff = moment.duration(now.diff(then));

	if(diff.years() > 0 || diff.months() > 0 || 
		diff.days() > 0 || diff.hours() > 0)
		return true;

	if(diff.minutes() >= (ceiling || STALE_CEILING))
		return true;
	else
		return false	
}

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

function getTournamentSetIds(tournamentId){
	if(!tournamentId) {
		console.error('type Tournament must include a tournamentId');
		return;
	}
	return smashgg.getTournament(tournamentId)
		.then(tourney => { return tourney.getAllMatchIds(); })
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

function getPlayersForPhaseGroup(groupId){
	if(ggResults.phaseGroups.hasOwnProperty(groupId)) 
		return Promise.resolve(null);
	return smashgg.getPhaseGroup(groupId)
		.then(group => { 
			ggResults.phaseGroups[groupId] = group;
			return group.getPlayers()
		})
		.catch(console.error);
}

function getPlayers(){
	let ids = Object.values(arguments);
	ids.forEach(id => { 
		if(!id || ggResults.players.hasOwnProperty(id))
			ids.splice(ids.indexOf(id), 1)
	})

	return smashgg.getPlayers(ids)
		.then(players => {
			players.forEach(player => { 
				ggResults.players[player.id] = player;
			})
			return players;
		})
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
	ggResults.phaseGroups = {};
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
function getPhaseGroups(){
	return Object.values(ggResults.phaseGroups);
}
function getPlayers(){
	return Object.values(ggResults.players);
} 
function getPlayerByEntrantId(entrantId){
	return ggResults.players[entrantId]
}

ggResults.getRecentResults = init;
ggResults.getCompleted = getCompleted;
ggResults.getIncomplete = getIncomplete;
ggResults.getStale = getStale;
ggResults.getPlayers = getPlayers;
ggResults.getPlayerByEntrantId = getPlayerByEntrantId;
ggResults.getPhaseGroups = getPhaseGroups;
ggResults.isStale = isStale;
ggResults.setStaleCeiling = setStaleCeiling;


module.exports = ggResults;
*/