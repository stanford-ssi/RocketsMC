'use strict';

app.controller('launchFlowController', ['$scope', '$rootScope', '$location', '$resource', '$http',
  function ($scope, $rootScope, $location, $resource, $http) {/* callback to process the FetchModel for the current visiting user */

      $scope.onlineCallback = function(model){
         $scope.$apply(function () {
           $scope.main.num_online = model;
           console.log(JSON.parse(model));
           if($scope.main.num_online == 1){
             $scope.main.rocketeers = "Rocketeer";
           }else{
             $scope.main.rocketeers = "Rocketers";
           }
         });
      };

      $scope.sendMessage = function(){
        $scope.main.send(this.text);

        // add the message to our model locally
        $scope.main.messages.push({
          source:"/images/human.png",
          name: "Controller",
          message: this.text,
          time: new Date()
        });
        document.getElementById("chatting").reset();
      };

      $scope.main.num_online = $scope.main.FetchModel("/online", $scope.onlineCallback);

      //make available to all sub controllers
      $scope.updateOnline = function(){
        $scope.main.num_online = $scope.main.FetchModel("/online", $scope.onlineCallback);
      };

      function checkTime(i) {
          if (i < 10) {i = "0" + i};  // add zero in front of numbers < 10
          return i;
      }

      $scope.setTimer = function() {
        if($scope.main.subscribed){
          var now = new Date();
          var timer = (now.getTime() - $scope.main.liveViewInfo[$scope.main.selected_launch_name].lastStateChange.getTime())/1000;
          var h = Math.floor(timer / 3600);
          var m = Math.floor(timer / 60);
          var s = Math.floor(timer % 100);
          m = checkTime(m);
          s = checkTime(s);
          document.getElementById('sinceTime').innerHTML = "T+"+ m + ":" + s;
          var t = setTimeout($scope.setTimer, 500);
        }
      };

      $scope.setTimer();

      $scope.updateView = function(val){
        $scope.main.graphSelection = val;
      };

      //just so we have something to start out with, let's gen arrays for the empty launch name
      if ($scope.main.selected_launch_name === "initialization"){
        $scope.main.generateArrays($scope.main.selected_launch_name);
      }

      /*$scope.onClick = function (points, evt) {
        console.log(points, evt);
      };*/

      $scope.confirmUpload = function(){
        $('#confirmUploadModal').modal();
      }

      $scope.markFlightComplete = function(flight_name){
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
           $scope.errorMsg = "There was an error in updating the flight status: " + JSON.parse(this.responseText);
           $('#errorModal').modal();
           return;
         }
         //Final State, error code of 2 signifies a successful sign up
         if (this.readyState === 4 && this.status === 200) {
           $scope.main.completionSuccessMessage = JSON.parse(this.responseText);
           $scope.main.flightList = $scope.main.FetchModel("/flight/listAll", $scope.main.doneFetchingFlightsCallback);
           $('#completionSuccessModal').modal();
           window.location = "#/flights-list";
           return;
         }
       };
        xhttp.open("POST", '/flight/complete');
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send("launch_name="+flight_name);
      };

      $scope.showAllStates = function(){
        $('#statesList').modal();
      };

      $scope.reviewAnomolies = function(){
        $('#anomolyList').modal();
      };

}]);
