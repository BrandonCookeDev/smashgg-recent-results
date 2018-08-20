# smashgg-recent-results

## Author
Brandon Cooke

## Intro
smashgg-recent-results is a vanilla JS file that uses Firebase, Moment, and smashgg-promise in order to 
aggregate smash.gg set data from a given tournamentId, eventId, phaseId, or phasegroupId in the smash.gg system.

## Dependencies
### Initialization
* NodeJS
* Firebase auth credentials

### Application
* [momentjs](https://momentjs.com)
* [firebase](https://firebase.google.com/docs/web/setup)
* [smashgg-promise](https://www.npmjs.com/package/smashgg-promise)

## Setup
The file must have secret credential data merged into it. If you don't have this auth data you may not use the file.
In order to set it up you must run the following:
```
./node_modules/.bin/ggResults_init
```
You will be prompted for the authentication information, at which the process will create the final ggResults.js file which is usable.

Use the following in your index.html to bring in the dependencies:
```html
<script src="node_modules/moment/moment.js"></script>
<script src="node_modules/firebase/firebase.js"></script>
<script src="node_modules/smashgg-promise/dist/smashgg-promise.js"></script>
<script src="node_modules/smashgg-recent-results">
```

## Use
To use the file, you can call the following object:
```javascript
ggResults
```

### Methods
#### Objects
* **SetAggregator(type, tournamentId, eventId, phaseId, groupId)**
	* type (String)
		* String that delineates what type of information is being fetched
		* May be one of the following values
			* "tournament"
			* "event"
			* "phase"
			* "phasegroup"
	* tournamentId - String
		* tournament slug of the tournament you wish to get sets from
	* eventId - String/Int
		* event slug or id number of the event you wish to pull.
			* if event slug, tournamentId is also required
	* phaseId - Int
		* phase id number of the phase you wish to get sets from
	* groupId - Int
		* phasegroup id number of the phasegroup you wish to get sets from

* **SortingHat()**

* **Groomer(cherkPeriod)**
	* checkPeriod - Int
		* Miliseconds in which the groomer waits to run again

* **Bucket(label)**
	* label - String

#### Methods 
* **isStale(set, ceiling)**
	* set - set data from smash.gg
		* generally retrieved from firebase when a set is updated
	* ceiling - Integer
		* the value of which a set is too old to be considered "fresh"

* **getFreshSets()**
	* Returns the array of sets in the "Fresh Bucket"

* **getStaleSets()**
	* Returns the array of sets in the "Stale Bucket"

* **getIncompleteSets()**
	* Returns the array of sets in the "Incomplete Bucket"

* **getTournamentBucket()**
	* Returns the array of values in the "Tournament Bucket"

* **getEventBucket()**
	* Returns the array of values in the "Event Bucket"

* **getPhaseBucket()**
	* Returns the array of values in the "Phase Bucket"
	
* **getPhaseGroupBucket()**
	* Returns the array of values in the "Phase Group Bucket"