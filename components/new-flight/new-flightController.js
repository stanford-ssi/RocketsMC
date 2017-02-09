'use strict';

app.controller('NewFlightController',
	       ['$scope', '$rootScope', '$location', '$resource', '$http','socket',
		function ($scope, $rootScope, $location, $resource, $http, socket) {
		    /*
		     * Controls the login view whcih allows users to sign up
		     * or login to existing accounts. Currently just lets users
		     * select their permission level with no check.
		     */

		    /* refresh the flightList so the new flight appears*/
		    $scope.doneCreatingFlightCallback = function(){
			$scope.$apply(function () {
			    $scope.main.flightList = $scope.main.FetchModel("/flight/listAll", $scope.main.doneFetchingFlightsCallback);
			});
		    };

		    $scope.checkboxModel = {
			value1 : false
		    };

		    $scope.parseSegments = [];
		    $scope.flightStates = [];
		    $scope.missing_fields = [];

		    $scope.addNewChoice = function(parse) { //parse true if we are changing the parse list
			if(!$scope.checkboxModel.value1) return;
			if(parse){
			    var newItemNo = $scope.parseSegments.length;
			    $scope.parseSegments.push({'id':newItemNo});
			}else{
			    var newStateNo = $scope.flightStates.length;
			    $scope.flightStates.push({'id':newStateNo});
			}
		    };

		    $scope.removeChoice = function(index,parse) {
			if(parse){
			    $scope.parseSegments.splice(index, 1);
			}else{
			    $scope.parseSegments.splice(index, 1);
			}
		    };

		    //let the user register a flight
		    $scope.registerFlight = function() {
			$scope.missing_fields = [];
			var channels = "";
			var units = "";
			var states = "";
			//check that the required fields are provided and that the passwords match
			if(!this.launch_name){
			    $scope.missing_fields.push(" Launch Name");
			}
			if(!this.launch_date){
			    $scope.missing_fields.push(" Launch Date");
			}
			if(!this.launch_objectives){
			    $scope.missing_fields.push(" Launch Objectives");
			}
			if(!this.rocket_name){
			    $scope.missing_fields.push(" Rocket Name");
			}
			if(!this.launcher){
			    $scope.missing_fields.push(" Responsible Launcher");
			}
			if(!this.launch_location){
			    $scope.missing_fields.push(" Launch Location");
			}
			if(!this.rocket_description){
			    $scope.missing_fields.push(" Rocket Description");
			}
			if(!this.organization){
			    $scope.missing_fields.push(" Launch Organization");
			}
			if(!this.dimensions){
			    $scope.missing_fields.push(" Dimensions");
			}
			if(!this.materials){
			    $scope.missing_fields.push(" Materials");
			}
			if(!this.motor){
			    $scope.missing_fields.push(" Motor");
			}
			if(!this.avionics){
			    $scope.missing_fields.push(" Avionics");
			}
			if(!this.payload_description){
			    $scope.missing_fields.push(" Payload Description");
			}
			if($scope.checkboxModel.value1){
			    if(!this.portName){
				$scope.missing_fields.push(" TTY Port Name");
			    }
			    if(!this.baudRate){
				$scope.missing_fields.push(" Baud Rate");
			    }
			    var numChannels = $scope.parseSegments.length;
			    if (numChannels === 0){
				$scope.missing_fields.push("Parse Scheme Definition");
			    }
			    for (var i = 0; i < numChannels; i++) {
				if(!$scope.parseSegments[i].name || !$scope.parseSegments[i].units){
				    $scope.missing_fields.push(" Parse Scheme Channel #: " + ($scope.parseSegments[i].id + 1));
				} else{
				    channels += ($scope.parseSegments[i].name + ",");
				    units += ($scope.parseSegments[i].units + ",");
				}
			    }

			    var numStates = $scope.flightStates.length;
			    if (numStates === 0){
				$scope.missing_fields.push("State Machine Definition");
			    }
			    for (var j = 0; j < numStates; j++) {
				if(!$scope.flightStates[j].info){
				    $scope.missing_fields.push(" State Machine Description #: " + ($scope.flightStates[j].id + 1));
				} else{
				    states += ($scope.flightStates[j].info + ",");
				}
			    }
			}

			if ($scope.missing_fields.length > 0){
			    $scope.main.errorMsg = "Missing Fields: " + $scope.missing_fields;
			    //console.log($scope.errorMsg);
			    $('#errorModal').modal();
			    return;
			}

			//replace optional fields with an empty string if undefined
			var msgParseChar = encodeURIComponent("\n");
			if(this.msgParseChar){
			    msgParseChar = encodeURIComponent(this.msgParseChar);
			}
			var chnParseChar = encodeURIComponent(",");
			if(this.chnParseChar){
			    chnParseChar = encodeURIComponent(this.chnParseChar);
			}
			var notes = this.notes;
			if(!this.notes){
			    notes = "";
			}

			// create the XMLHttpRequest object
			var xhttp;
			xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
			    //Don’t do anything if not final state
			    if (this.readyState !== 4){
				return;
			    }
			    //Final State but status not OK, send the error code as 0
			    if (this.readyState === 4 && this.status === 400) {
				$scope.main.errorMsg = "There was an error in registering the flight: " + JSON.parse(this.responseText);
				$('#errorModal').modal();
				return;
			    }
			    //Final State, error code of 2 signifies a successful sign up
			    if (this.readyState === 4 && this.status === 200) {
				$scope.doneCreatingFlightCallback();
				if($scope.main.registering === true){
				    window.location = "#/login-register";
				}else{
				    window.location = "#/launchFlow";
				}
				$scope.main.showSuccess();
				return;
			    }
			};
			xhttp.open("POST", '/flight/create');
			xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xhttp.send("launch_name="+this.launch_name+"&launch_date="+this.launch_date+"&launch_objectives="+this.launch_objectives+
				   "&rocket_name="+this.rocket_name+"&launcher="+this.launcher+"&launch_location="+this.launch_location+
				   "&materials="+this.materials+"&motor="+this.motor+"&avionics="+this.avionics+"&payload_description="+this.payload_description+
				   "&rocket_description="+this.rocket_description+"&organization="+this.organization+"&dimensions="+this.dimensions+
				   "&notes="+notes+"&kythera="+$scope.checkboxModel.value1+"&portName="+encodeURIComponent(this.portName)+"&baudRate="+this.baudRate+
				   "&msgParseChar="+msgParseChar+"&chnParseChar="+chnParseChar+"&channels="+encodeURIComponent(channels)+
				   "&units="+encodeURIComponent(units)+"&states="+encodeURIComponent(states));
		    };
		}]);
