var app = angular.module('myApp', []);
app.controller('myCtrl', function($scope) {
		$scope.form = {
			type: null,
			tournamentId: null,
			eventId: null,
			phaseId: null,
			groupId: null,
			amount: null,
			checkPeriod: null,
			reset: null
			/*
			callback: function(snapshot){
				console.log(snapshot.val());
			}
			*/
		}

		$scope.status = '';
		$scope.completed = '';
		$scope.incomplet = '';
		$scope.stale = '';

		$scope.submitRecentResultsQuery = function(){
			$scope.status = 'Gathering sets';
			let aggregator = new ggResults.SetAggregator(
				$scope.form.type,
				$scope.form.tournamentId,
				$scope.form.eventId, 
				$scope.form.phaseId,
				$scope.form.groupId
			);
			aggregator.getSets(function(err, set){
				console.log(set);
			})

		}

		function formatSets(sets){
			if(!sets) return null;
			else if(sets.length == 0) return [];
			
			sets = sets.filter(set => { return set.entrant1Score != -1 && set.entrant2Score != -1 && set.startedAt; });

			return sets.map(set => {
				let p1 = set.entrant1;
				let p2 = set.entrant2;
				let tag1 = p1 ? p1.tag : 'bye';
				let tag2 = p2 ? p2.tag : 'bye';
				let staleBy = set.staleBy || '';
				return `${tag1} ${set.entrant1Score || 0} - ${set.entrant2Score || 0} ${tag2} ${': ' + staleBy || ''}`;
			})
		}

		setInterval(function(){
			$scope.$apply(function () {
				$scope.completed = formatSets(ggResults.getFreshSets().toArray());
				$scope.incomplete = formatSets(ggResults.getIncompleteSets().toArray());
				$scope.stale = formatSets(ggResults.getStaleSets().toArray());
			})
		}, 1000);
	})