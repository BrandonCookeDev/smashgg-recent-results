'use strict';

let sinon = require('sinon');
let moment = require('moment');
let {Tournament, Event} = require('smashgg.js');
let main = require('../main');

(async function(){
	try{
		let clock;
		let t = await Tournament.getTournament('ceo-2016')
		let tournamentDate = moment(t.getStartTime()).add(30, 'minutes').toDate();
		
		//clock = sinon.useFakeTimers(tournamentDate);

		let input = {
			body:{
				type: 'EVENT',
				tournamentId: 'ceo-2016',
				eventId: 'melee-singles',
				amount: 15,
				d: tournamentDate.toString()
			}
		}

		let value = await runmain(input);

		//clock.restore();

		let e = await Event.getEvent(121480);
		let eventDate = moment(e.getStartTime()).add(30, 'minutes').toDate();
		clock = sinon.useFakeTimers(eventDate);
		input = {
			body:{
				type: 'PHASE',
				phaseId: '269600',
				amount: 15
			}
		}
		value = await runmain(input);

		clock.restore()
		let groupDate = moment(e.getStartTime()).add(20, 'minutes').toDate();
		clock = sinon.useFakeTimers(groupDate);
		input = {
			body:{
				type: 'PHASEGROUP',
				phaseGroupId: '589463',
				amount: 15
			}
		}
		value = await runmain(input);
	} catch(e){
		console.error(e);
		throw e;
	}
})()

function runmain(input){
	return new Promise(function(resolve, reject){
		main.handler(input, null, async function(err, value){
			if(err){
				console.error(err);
				return reject(err);
			}

			console.log(input.body.type, value.length);
			return resolve(value);
		});
	})
}