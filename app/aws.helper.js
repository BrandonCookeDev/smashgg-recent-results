'use strict';

let AWS = require('aws-sdk');
let dynamoDB = AWS.DynamoDB({region: 'us-east-1'});
let redis = require('redis');
let redisUrl = 'redis://smashgg-recent-games.h6xjkp.ng.0001.usw2.cache.amazonaws.com';
let redisTTL = process.env.redisTTL || 15000;

module.exports = class Helper{

	static async init(){
		Helper.cache = redis.createClient({
			url: redisUrl,
			port: 6379
		})
	}

	static getAll(){
		return new Promise(function(resolve, reject){
			Helper.cache.get('*', (err, val) => {
				if(err){
					console.error(err);
					return reject(err);
				}
				return resolve(val);
			})
		});
	}

	static get(key){
		return new Promise(function(resolve, reject){
			Helper.cache.get(key, (err, val) => {
				if(err){
					console.error(err);
					return reject(err);
				}
				return resolve(val);
			})
		})
	}

	static set(key, val, ttl){ // TODO implement TTL
		return new Promise(function(resolve, reject){
			Helper.cache.set(key, val, err => {
				if(err){
					console.error(err);
					return reject(err);
				}
				return resolve();
			})
		})
	}
}