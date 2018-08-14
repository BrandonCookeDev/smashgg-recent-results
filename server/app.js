var app = angular.module('myApp', []);
app.controller('myCtrl', function($scope) {
		$scope.form = {
			type: null,
			tournamentId: null,
			eventId: null,
			phaseId: null,
			groupId: null,
			amount: null,
			checkPeriod: null
		}

		$scope.completed = '';
		$scope.incomplet = '';
		$scope.stale = '';

		function formatSet(set){
			
		}

		$scope.submitRecentResultsQuery = function(){
			ggResults.getRecentResults($scope.form)
				.then(ids => {
					setTimeout(function(){
						$scope.$apply(function () {
							$scope.completed = ggResults.getCompleted();
							$scope.incomplete = ggResults.getIncomplete();
							$scope.stale = ggResults.getStale();
						})
					}, 5000);
				})
		}
	})