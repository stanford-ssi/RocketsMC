'use strict';

app.controller('LoginRegisterController', ['$scope', '$rootScope', '$location', '$resource', '$http','socket',
  function ($scope, $rootScope, $location, $resource, $http, socket) {
    /*
     * Controls the login view whcih allows users to sign up
     * or login to existing accounts. Currently just lets users
     * select their permission level with no check.
     */

     // Discourage page frefresh for launch controllers
     var confirmOnPageExit = function (e){
          // If we haven't been passed the event get the window.event
          e = e || window.event;
          var message = 'Any text will block the navigation and display a prompt';
          // For IE6-8 and Firefox prior to version 4
          if (e){
              e.returnValue = message;
          }
          // For Chrome, Safari, IE8+ and Opera 12+
          return message;
     };

     if($scope.main.here){
       $scope.main.resetAlldata()
     }

     // Let the user logon
     $scope.logon = function(num) {
       if(num === 3){
         $scope.main.message = "Return ";
         $scope.main.registering = true;
         window.location.href = "#/new-flight";
         $scope.main.viewSideBar = false;
         //$location.path("#/new-flight");
       }
       if(num === 2){
         $scope.main.permission = true;
         $scope.main.message = "Logout of Admin Session ";
         window.location.href = "#/flights-list";
         $scope.main.viewSideBar = true;
         //$location.path("#/flights-list");
       }
       if(num === 1){
         //$scope.main.permission = true;
         $scope.main.message = "Logout of Kythera Control Session ";
         // Turn on the warning if this is a controller session
         window.onbeforeunload = confirmOnPageExit;
         $scope.main.selectingControlSession = true;
         window.location.href = "#/flights-list";
         $scope.main.viewSideBar = true;
         //$location.path("#/flights-list");
       }
       if(num === 0){
         $scope.main.message = "Logout of View-Only Session ";
         $scope.main.flightList = $scope.main.FetchModel("/flight/listAll", $scope.main.doneFetchingFlightsCallback);
         window.location.href = "#/flights-list";
         $scope.main.viewSideBar = true;
         //$location.path("#/flights-list");
       }

       $scope.main.welcome = "Welcome to Hawthorne 😎";
       $scope.main.here = true;
       $scope.$apply();
     };
  }]);
