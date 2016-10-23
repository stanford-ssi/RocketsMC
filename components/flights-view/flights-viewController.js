'use strict';

app.controller('FlightsViewController', ['$scope', '$rootScope', '$location', '$resource', '$http',
  function ($scope, $rootScope, $location, $resource, $http) {
    $scope.activeTag = "Active Kythera Flights";
    $scope.completeTag = "Complete Kythera Flights";
    $scope.infoTag = "Registered non-Kythera Flights";
    $scope.isCollapsed = false;
    $scope.main.launchToDelete = null;
    $scope.main.statusToDelete = null;
    $scope.main.flightToControl = null;
    $scope.downloadComplete = {};

    /* callbacks to process the FetchModel for the registered flights */

    /* get list of active Kythera flights registered */
    $scope.main.doneFetchingActiveFlightsCallback = function(model){
       $scope.$apply(function () {
         if (model === undefined) return;

         var response = JSON.parse(model);
         $scope.main.activeFlights = response;
       });
    };

    /* get list of completed Kythera flights registered */
    $scope.main.doneFetchingCompletedFlightsCallback = function(model){
       $scope.$apply(function () {
         if (model === undefined) return;

         var response = JSON.parse(model);
         $scope.main.completeFlights = response;
       });
    };

    /* get list of non-Kythera flights registered */
    $scope.main.doneFetchingInfoFlightsCallback = function(model){
       $scope.$apply(function () {
         if (model === undefined) return;

         var response = JSON.parse(model);
         $scope.main.infoFlights = response;
       });
    };

    $scope.main.activeFlights = $scope.main.FetchModel("/flight/listActive", $scope.main.doneFetchingActiveFlightsCallback);
    $scope.main.completeFlights = $scope.main.FetchModel("/flight/listComplete", $scope.main.doneFetchingCompletedFlightsCallback);
    $scope.main.infoFlights = $scope.main.FetchModel("/flight/listNonKythera", $scope.main.doneFetchingInfoFlightsCallback);

    /* Get the launch flow view ready to go */
    $scope.setUpLiveFlight = function(flight){
      $scope.main.selected_launch_name = flight.launch_name;
      $scope.main.selected_flight_states = flight.states.split(",").slice(0,-1);
      if($scope.main.telemData[flight.launch_name] === undefined){
        $scope.main.generateArrays(flight.launch_name, flight.channels, flight.units, (flight.channels.split(",").length - 1), flight.chnParseChar); //if we have never seen this launch name, we need to generate its data arrays
      }
      $scope.main.updateViewForFlight();
      window.location = "#/launchFlow";
    };

    $scope.main.cancelControlSelection = function(){
      $scope.main.flightToControl = null;
    };

    $scope.canGoLive = function(status){
      if(!$scope.main.selectingControlSession && status === "active"){
        return true;
      }
      return false;
    };

    $scope.main.loadFlightControl = function(){
      $scope.activateFlight($scope.main.flightToControl);
    };

    //let the user register a flight
    $scope.activateFlight = function(flight) {
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
         $scope.main.activationError();
         return;
       }
       //Final State, error code of 2 signifies a successful sign up
       if (this.readyState === 4 && this.status === 200) {
         $scope.main.restrictedControlSession = true;
         $scope.main.selectingControlSession = false;
         $scope.main.showActivateSuccess();
         $scope.setUpLiveFlight(flight);
         return;
       }
       if (this.readyState === 4 && this.status === 700) {
         $scope.main.restrictedControlSession = true;
         $scope.main.selectingControlSession = false;
         $scope.setUpLiveFlight(flight);
         return;
       }
     };
      xhttp.open("POST", '/flight/activate');
      xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      xhttp.send("launch_name="+flight.launch_name);
      $scope.main.activeFlights = $scope.main.FetchModel("/flight/listActive", $scope.main.doneFetchingActiveFlightsCallback);
    };

    //callback that refreshes and notifies the user after a flight is removed
    $scope.main.doneRemovingFlightCallback = function(model, error, type){
      $scope.$apply(function () {
        if(error){
          $scope.main.alertMessage = JSON.parse(model);
        } else{
          $scope.main.alertMessage = "Flight deleted";
        }

        $('#alertModal').modal();
        if(type == "active" || type == "idle"){
          $scope.main.activeFlights = $scope.main.FetchModel("/flight/listActive", $scope.main.doneFetchingActiveFlightsCallback);
        }
        if(type == "complete"){
          $scope.main.completeFlights = $scope.main.FetchModel("/flight/listComplete", $scope.main.doneFetchingCompletedFlightsCallback);
        }
        if(type == "non-Kythera"){
          $scope.main.infoFlights = $scope.main.FetchModel("/flight/listNonKythera", $scope.main.doneFetchingInfoFlightsCallback);
        }
      });
    };

    $scope.main.removeFlight = function(launch_name, type){
      if($scope.launchToDelete === null || $scope.statusToDelete === null){
        return;
      }
      // create the XMLHttpRequest object
      var xhttp;
      xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        //Don’t do anything if not final state
       if (this.readyState !== 4){
         return;
       }
       //Final State but status not OK
       if (this.readyState === 4 && this.status === 400) {
         $scope.main.doneRemovingFlightCallback(this.responseText, true, type);
         return;
       }
       //Final State
       if (this.readyState === 4 && this.status === 200) {
         $scope.main.doneRemovingFlightCallback(this.responseText, false, type);
         return;
       }
     };

     xhttp.open("POST", "/flight/delete");
     xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
     xhttp.send("launch_name="+launch_name);

    };

    $scope.cancelRemoval = function(){
      $scope.launchToDelete = null;
      $scope.statusToDelete = null;
    };

    var formatPFA = function(flight){
      var genDate = $scope.main.formatTime(new Date(), true);
      var formattedString = "--------------------- LAUNCH REPORT ---------------------\n"
      + "Generated on " + genDate + "\n\n"
      + "\nLaunch Name: " + flight.launch_name
      + "\nDatabase ID: " + flight._id
      + "\nLaunch Date: " + $scope.main.formatTime(flight.launch_date, false)
      + "\nLaunch Objectives: " + flight.launch_objectives
      + "\nRocket Name: " + flight.rocket_name
      + "\nLauncher: " + flight.launcher
      + "\nLaunch Location: " + flight.launch_location
      + "\nRocket Description: " + flight.rocket_description
      + "\nLaunch Organization: " + flight.organization
      + "\nVehicle Dimensions: " + flight.dimensions
      + "\nMaterials: " + flight.materials
      + "\nMotor: " + flight.motor
      + "\nAvionics: " + flight.avionics
      + "\nPayload Description: " + flight.payload_description
      + "\nNotes: " + flight.notes
      + "\nFlight Status: " + flight.status;
      return formattedString;
    };

    /* A hacky little function that downloads the blob as a file without user input */
    $scope.main.downloadBlob = function(filename, blob) {
      var a = document.createElement('a');
      a.style = "display: none";
      var url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
         document.body.removeChild(a);
         window.URL.revokeObjectURL(url);
      }, 100);
    };

    $scope.downloadPFAInfo = function(flight){
      $scope.main.alertGeneration()
      var formattedPFA = formatPFA(flight);
      // check to see if there is data as well
      if(flight.status === "complete"){
        $scope.main.requestFlightDataAsCSV(flight.launch_name);
        formattedPFA = formattedPFA + "\nA flight data CSV is available and has been requested. Standby for the file to transfer and download.\n\n";
      }else{
        formattedPFA = formattedPFA + "\nNo flight data available\n";
      }
      formattedPFA = formattedPFA + "\n\n--------------------- END OF REPORT ---------------------\n";
      var PFABlob = new Blob([formattedPFA], { type: 'text/plain' });
      var pfaFileName = "launch_info_" + flight.launch_name + ".txt";
      $scope.main.downloadBlob(pfaFileName, PFABlob);
      $scope.downloadComplete[flight._id] = true;
    };

    $scope.genEmail = function(flight){
      if (!this.recipient){
        $scope.main.emailErrorRecp();
        return;
      }
      //$scope.downloadPFAInfo(flight);
      var fileNames = "Downloads/launch_info_" + flight.launch_name + ".txt";
      if(flight.status === "complete"){
        fileNames = fileNames + " & Downloads/launch_data_" + flight.launch_name + ".csv";
      }
      $scope.main.emailLaunchMessage(fileNames);
      var subject = flight.rocket_name + " - " + flight.launch_name + " Flight Report";
      var recip = this.recipient;
      var body = encodeURIComponent("Hi there,\n\nA Flight report for " + flight.launch_name + " was downloaded. It should be attached.");
      window.location.href = "mailto:"+recip+"?subject="+subject+"&body="+body;
    };

}]);
