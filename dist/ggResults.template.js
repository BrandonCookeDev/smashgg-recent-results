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
		super();
		this.label = label;
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
		let ret = Object.assign({}, this);
		delete ret.label;
		return Object.values(ret);
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
			let diff = SortingHat.isStale(completedAt);
			if(diff){
				set.class = 'STALE';
				set.staleBy = diff.humanize();
				SortingHat.addToStale(set);
			}
			else{
				set.class = 'FRESH';
				SortingHat.addToFresh(set);
			}
		}
		else{
			set.class = 'INCOMPLETE';
			SortingHat.addToIncomplete(set);
		}
	}

	static isStale(timestamp, ceiling){
		let now = moment();
		let then = moment.unix(timestamp);
		let diff = moment.duration(now.diff(then));

		if(diff.years() > 0 || diff.months() > 0 || 
			diff.days() > 0 || diff.hours() > 0)
			return diff;

		if(diff.minutes() >= (ceiling || 5))
			return diff;
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

	static init(){

	}

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

	static setCallbackFunctions(ids, cb) {
		ids.forEach(id => {
			let thisSet = database.ref('{{firebaseDbPath}}' + id).orderByKey();
			thisSet.on('value', snapshot => {
				let val = snapshot.val();
				let set = val.entities.sets;

				SetAggregator.getPlayersForPhaseGroup(set.phaseGroupId)
					.then(players => { 
						players.forEach(player => {
							PlayersBucket.getInstance().add(player.participantId, player);
						})
					})
					.then(() => { 
						return SetAggregator.getEventName(set.eventId)
							.then(eventName => {
								set.eventName = eventName;
								return set;
							})
					})
					.then(() => {
						let player1 = PlayersBucket.getInstance().get(set.entrant1Id);
						let player2 = PlayersBucket.getInstance().get(set.entrant2Id);
						set.entrant1 = player1;
						set.entrant2 = player2;
						SortingHat.sort(set);
						cb(null, set);
					})
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
			.then(tourney => {
				TournamentBucket.getInstance().add(tournamentId, tourney);
				return tourney;
			})
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
			.then(event => {
				let key = EventBucket.generateKey(eventId, tournamentId);
				EventBucket.getInstance().add(event.id, event);
				return event;
			})
			.then(event => { return event.getEventMatchIds(); })
			.catch(console.error);
	}

	static getPhaseSetIds(phaseId){
		if(!phaseId){
			console.error('type phase must include a phaseId');
			return;
		}

		return smashgg.getPhase(phaseId)
			.then(phase => {
				PhaseBucket.getInstance().add(phaseId, phase);
				return phase;
			})
			.then(phase => { return phase.getPhaseMatchIds(); })
			.catch(console.error);
	}

	static getPhaseGroupSetIds(groupId){
		if(!groupId){
			console.error('type phasegroup must include a groupId');
			return;
		}

		return smashgg.getPhaseGroup(groupId)
			.then(group => {
				PhaseGroupBucket.getInstance().add(groupId, group);
				return group;
			})
			.then(group => { return group.getMatchIds(); })
			.catch(console.error);
	}

	static getEventName(eventId, tournamentId){
		let key = EventBucket.generateKey(eventId, tournamentId);
		if(EventBucket.getInstance().exists(key))
			return Promise.resolve(EventBucket.getInstance().get(key).getName());

		return smashgg.getEvent(tournamentId, eventId)
			.then(event => {
				EventBucket.getInstance().add(key, event);
				return event.getName();
			})
			.catch(console.error);
	}

	static getPhaseName(phaseId){
		if(PhaseBucket.getInstance().exists(phaseId))
			return Promise.resolve(PhaseBucket.getInstance().get(phaseId).getName());

		return smashgg.getPhase(phaseId)
			.then(phase => {
				PhaseBucket.getInstance().add(phaseId, phase);
				return phase.getName();
			})
			.catch(console.error);
	}

	static getPlayersForPhaseGroup(groupId){
		if(PhaseBucket.getInstance().exists(groupId)) 
			return Promise.resolve(PhaseBucket.getInstance().toArray());

		return smashgg.getPhaseGroup(groupId)
			.then(group => { 
				PhaseBucket.getInstance().add(groupId, group);
				return group.getPlayers();
			})
			.catch(console.error);
	}

	static getPlayers(){
		let ids = Object.values(arguments);
		ids.forEach(id => { 
			if(!id || PlayersBucket.getInstance().exists(id))
				ids.splice(ids.indexOf(id), 1)
		})

		return smashgg.getPlayers(ids)
			.then(players => {
				players.forEach(player => { 
					PlayersBucket.getInstance().add(player.id, player);
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

class TournamentBucket extends Bucket{
	constructor(){
		super();
		this.label = 'TOURNAMENT';
	}

	static getInstance(){
		if(!TournamentBucket.instance)
			TournamentBucket.instance = new TournamentBucket();
		return TournamentBucket.instance;
	}
}

class EventBucket extends Bucket{
	constructor(){
		super();
		this.label = 'EVENT';
	}

	static getInstance(){
		if(!EventBucket.instance)
			EventBucket.instance = new EventBucket();
		return EventBucket.instance;
	}

	static generateKey(eventId, tournamentId){
		if(isNaN(eventId))
			return `${eventId}::${tournamentId}`;
		else
			return eventId;
	}
}

class PhaseBucket extends Bucket{
	constructor(){
		super();
		this.label = 'PHASE';
	}

	static getInstance(){
		if(!PhaseBucket.instance)
			PhaseBucket.instance = new PhaseBucket();
		return PhaseBucket.instance;
	}
}

class PhaseGroupBucket extends Bucket{
	constructor(){
		super();
		this.label = 'PHASEGROUP';
	}

	static getInstance(){
		if(!PhaseGroupBucket.instance)
			PhaseGroupBucket.instance = new PhaseGroupBucket();
		return PhaseGroupBucket.instance;
	}
}

class PlayersBucket extends Bucket{
	constructor(){
		super();
		this.label = 'PLAYERS';
	}

	static getInstance(){
		if(!PlayersBucket.instance)
			PlayersBucket.instance = new PlayersBucket();
		return PlayersBucket.instance;
	}
}

ggResults.SetAggregator = SetAggregator;
ggResults.SortingHat = SortingHat;
ggResults.Groomer = Groomer;
ggResults.Bucket = Bucket;
ggResults.isStale = SortingHat.isStale;
ggResults.getFreshSets = SortingHat.getFreshBucket;
ggResults.getStaleSets = SortingHat.getStaleBucket;
ggResults.getIncompleteSets = SortingHat.getIncompleteBucket;
ggResults.getTournamentBucket = TournamentBucket.getInstance();
ggResults.getEventBucket = EventBucket.getInstance();
ggResults.getPhaseBucket = PhaseBucket.getInstance();
ggResults.getPhaseGroupBucket = PhaseGroupBucket.getInstance();

module.exports = ggResults;