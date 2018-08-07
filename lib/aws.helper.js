'use strict';

let AWS = require('aws-sdk');
let dynamoDB = AWS.DynamoDB({region: 'us-east-1'});
let redis = require('redis');
let redisUrl = 'redis://smashgg-recent-games.h6xjkp.ng.0001.usw2.cache.amazonaws.com';

module.exports = class Helper{

	static init(){
		Helper.cache = redis.createClient({
			url: redisUrl,
			port: 6379
		})
	}

	static async getAll(){
		Helper.cache.
	}
}