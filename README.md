# smashgg-recent-results
## Author: Brandon Cooke

smashgg-recent-results is code that runs on an AWS Lambda function, fronted by an API Gateway endpoint, and leverages [`smashgg.js`](www.github.com/BrandonCookeDev/smashgg.js) in order to extract the recently completed games from a `Tournament`, `Event`, `Phase`, or `PhaseGroup`.

The Lambda takes the following body data:
```javascript
body: {
	type: 'TOURNAMENT' | 'EVENT' | 'PHASE' | 'PHASEGROUP', //note not case sensitive 
	minutesBack: {integer minutes back you wish to search for sets that were just completed},
	tournamentId: '{smashgg tournament slug}', // required if type = TOURNAMENT || type = EVENT & eventId is event slug
	eventId: '{smashgg event slug or event id number}', //required if type = EVENT
	phaseId: '{smashgg phase id number}', //required if type = PHASE
	phaseGroupId: '{smashgg phase group id number}', //required if type = PHASEGROUP
}
```
