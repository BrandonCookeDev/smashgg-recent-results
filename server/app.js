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
			ggResults.getRecentResults($scope.form)
				.then(ids => {
					$scope.status = 'Got matches successfully!'
				})
				.catch(e => {
					$scope.status = 'ERROR: ' + e.message;
				})
		}

		function formatSets(sets){
			if(!sets) return null;
			else if(sets.length == 0) return [];
			
			sets = sets.filter(set => { return set.entrant1Score != -1 && set.entrant2Score != -1; });

			return sets.map(set => {
				let p1 = ggResults.getPlayerByEntrantId(set.entrant1Id);
				let p2 = ggResults.getPlayerByEntrantId(set.entrant2Id);
				let tag1 = p1 ? p1.tag : 'null';
				let tag2 = p2 ? p2.tag : 'null';
				return `${tag1} ${set.entrant1Score || 0} - ${set.entrant2Score || 0} ${tag2}`;
			})
		}

		setInterval(function(){
			$scope.$apply(function () {
				$scope.completed = formatSets(ggResults.getCompleted());
				$scope.incomplete = formatSets(ggResults.getIncomplete());
				$scope.stale = formatSets(ggResults.getStale());
			})
		}, 1000);
	})