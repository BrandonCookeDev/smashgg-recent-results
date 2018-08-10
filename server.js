'use strict';

let log = require('winston');
let bp = require('body-parser');
let express = require('express');
let main = require('./main');

let app = express();

app.use(bp.urlencoded());
app.use(bp.json());

app.post('/recent-results', function(req, res){
	try{
		log.info(req.body);
		var error = function(e){
			log.error(e);
			return res.status(500).send(e.message);
		}

		main.handler(req, null, function(err, val){
			if(err)
				return error(err)

			return res.status(200).send(val.body);
		})
	} catch(e){
		error(e);
	}
})

let port = process.env.PORT || '8081';
app.listen(port, function(err){
	if(err)
		log.error('Error spinning up express: %s', e);
	log.info('Server now listening on ' + port);
});