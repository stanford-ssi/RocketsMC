'use strict';

var app = angular.module('kytheraApp', ['ngRoute',
    'ngMaterial',
    'ngResource',
    'btford.socket-io',
    'chart.js',
    'luegg.directives'
  ]).
  config(function ($routeProvider) {
        $routeProvider.
            when('/launchFlow', {
                templateUrl: 'components/launchFlow/launchFlow.html',
                controller: 'launchFlowController'
            }).
            when('/login-register', {
                templateUrl: 'components/login-register/login-registerTemplate.html',
                controller: 'LoginRegisterController'
            }).
            when('/new-flight', {
                templateUrl: 'components/new-flight/new-flightTemplate.html',
                controller: 'NewFlightController'
            }).
            when('/flights-list', {
                templateUrl: 'components/flights-view/flights-viewTemplate.html',
                controller: 'FlightsViewController'
            }).
            when('/rawDownlink', {
                templateUrl: 'components/rawDownlink/rawDownlink.html',
                controller: 'rawDownlinkController'
            }).
            otherwise({
                redirectTo: '/login-register'
            });

    });

// SET UP THE SOCKETS
app.factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };
});

app.controller('MainController', ['$scope', '$rootScope', '$location', '$resource', '$http','socket',
  function ($scope, $rootScope, $location, $resource, $http, socket) {
        $scope.main = {};

        // create some prarams that will be shared by all controllers
        $scope.main.permission = false;
        $scope.main.project = "Kythera Ground Station";
        $scope.main.message = "Please Login"
        $scope.main.session = {};

        $scope.main.here = false;
        $scope.main.num_online = 0;
        $scope.main.rocketeers = "Rocketers";

        $scope.main.registering = false; //True when logged in user is registering a new flight
        $scope.main.viewSideBar = false;
        $scope.main.restrictedControlSession = false; //prevent the control session from accessing the flight select page
        $scope.main.selectingControlSession = false;

        /* Params for keeping track of which flight we're wathcing in Live View */
        $scope.main.devPath = ""; //serial path
        $scope.main.selected_launch_name = "initialization"; //name of the launch selected
        $scope.main.selected_flight_states = [];
        $scope.main.subscribed = false; //true when the user is on the subscribers list
        $scope.main.Series = {};
        $scope.main.Series.initialization = [['Altitude (m)'],['Roll Rate(rev/s)'],['Pitch(deg)']
                                            ,['Yaw(deg)'], ['Acceleration Z-axis(m/s^2)'], ['Acceleration Y-axis(m/s^2)']
                                            ,['Acceleration X-axis(m/s^2)'], ['Temp(F)']];
        $scope.main.graphSelection = 0;

        $scope.main.channel_list = {};
        $scope.main.units_list = {};
        $scope.main.num_channels = [];

        /* Downlink Struct
           As soon as the client subscribes to live view, all active ports on
           the server will send data to the client. This data is parsed and stored
           in the following sctuct, indexed by flight name */
        $scope.main.telemData = {};
        $scope.main.liveViewInfo = {};
        $scope.main.graphData = {};
        $scope.main.downlinkStream = {}; //all unparsed messages by flight name
        $scope.main.graph = {};
        $scope.main.parseChars = {};

        $scope.main.reportingAnomolies = {};

        $scope.main.resetAlldata = function(){
          window.onbeforeunload = null;
          $scope.main.telemData = {};
          $scope.main.reportingAnomolies = {};
          $scope.main.liveViewInfo = {};
          $scope.main.graphData = {};
          $scope.main.downlinkStream = {}; //all unparsed messages by flight name
          $scope.main.graph = {};
          $scope.main.session = {};
          $scope.main.permission = false;
          $scope.main.here = false;
          $scope.main.message = "Please Login"
          $scope.main.registering = false; //True when logged in user is registering a new flight
          $scope.main.viewSideBar = false;
          $scope.main.restrictedControlSession = false; //prevent the control session from accessing the flight select page
          $scope.main.selectingControlSession = false;
          $scope.main.devPath = ""; //serial path
          $scope.main.selected_launch_name = "initialization"; //name of the launch selected
          $scope.main.selected_flight_states = ["None"];
          $scope.main.subscribed = false; //true when the user is on the subscribers list
          $scope.main.graphSelection = 0;
          $scope.main.channel_list = {};
          $scope.main.units_list = {};
          $scope.main.num_channels = [];
          $scope.main.parseChars = {};
        }

        /*
         * FetchModel - Fetch a model from the web server.
         *   url - string - The URL to issue the GET request.
         *   doneCallback - function - called with argument (model) when the
         *                  the GET request is done. The argument model is the object
         *                  containing the model. model is undefined in the error case.
         */
        $scope.main.FetchModel = function(url, doneCallback) {
          var model;
          var error = false;
          /* create the XMLHttpRequest object */
          var xhttp;
          xhttp = new XMLHttpRequest();
          xhttp.onreadystatechange = function() {
            //Don’t do anything if not final state
           if (this.readyState !== 4){
             return;
           }
           //Final State but status not OK
           if (this.status !== 200) {
             error = true;
             var empty;
             doneCallback(empty);
             return;
           }
           //Final State
           if (this.readyState === 4 && this.status === 200) {
             doneCallback(this.responseText);
             return;
           }
         };
          xhttp.open("GET", url);
          xhttp.send();
        };

        /* get list of flights registered */
        $scope.main.doneFetchingFlightsCallback = function(model){
           $scope.$apply(function () {
             if (model === undefined) return;

             var response = JSON.parse(model);
             $scope.main.flightList = response;
           });
        };

        // Flight lists:
        // - Active Kythera Flights: flights that the web server has open serial ports to
        // get data on
        // - Completed Kythera Flights: flights that the database has saved data logs for
        // so the user can load graphs for each flight
        // - Non Kythera Flights: always available in the Flights Page: the user can view
        // PFA information for each of these flights along with PFA info from completed
        // and active Kythera flights
        $scope.main.flightList = $scope.main.FetchModel("/flight/listAll", $scope.main.doneFetchingFlightsCallback);

        $scope.main.generateArrays = function(launch_name, channels, units, num_channels, chnParseChar) {
          $scope.main.telemData[launch_name] = {};
          $scope.main.graphData[launch_name] = {};
          $scope.main.liveViewInfo[launch_name] = {};
          $scope.main.downlinkStream[launch_name] = [];
          $scope.main.channel_list[launch_name] = channels.replace(" ","").split(",");
          $scope.main.units_list[launch_name] = units.replace(" ","").split(",");
          $scope.main.num_channels[launch_name] = num_channels;
          $scope.main.Series[launch_name] = [];
          $scope.main.parseChars[launch_name] = chnParseChar;
          $scope.main.reportingAnomolies[launch_name] = [];

          $scope.main.telemData[launch_name].timeStamps = [new Date().toTimeString().substring(3,9)];
          $scope.main.graphData[launch_name].timeStamps = [new Date().toTimeString().substring(3,9)]; //maybe one more []
          for(var i = 0; i < $scope.main.num_channels[launch_name]; i++){
            $scope.main.telemData[launch_name][i] = [0];
            $scope.main.graphData[launch_name][i] = [[0]];
            $scope.main.Series[launch_name].push([$scope.main.channel_list[launch_name][i]+" ("+$scope.main.units_list[launch_name][i]+")"]);
          }
          $scope.main.graphData[launch_name].iterator = 0;

          /* Flight specific info */
          $scope.main.liveViewInfo[launch_name].currentStage = 0;
          $scope.main.liveViewInfo[launch_name].anomolyCount = 0;
          $scope.main.liveViewInfo[launch_name].telemError = false;  // checksum error
          $scope.main.liveViewInfo[launch_name].messages = [];
          $scope.main.liveViewInfo[launch_name].lastStateChange = new Date();
          $scope.main.liveViewInfo[launch_name].healthy = false;  //LOS?
          $scope.main.liveViewInfo[launch_name].last_packet_time = null;

          // add the first message from this flight
          /* Each Message Contains
           * - profile photo
           * - profile name
           * - time
           * - message
           */
          var first_message = {};
          first_message.source = "/images/kythera.png";
          first_message.name = "Kythera";
          first_message.message = "Hey, I'm Kythera! I'll post updates here and may ask you questions before flight.";
          first_message.time = new Date();

          $scope.main.liveViewInfo[launch_name].messages.push(first_message);

        };

        $scope.main.updateGraphs = function(launch_name){
          var iterate_val = 30; //number of datapoints to include in the Live View graphs
          if($scope.main.graphData[launch_name].timeStamps.length < iterate_val + 1){
            $scope.main.graphData[launch_name].timeStamps.push($scope.main.telemData[launch_name].timeStamps.slice(-1)[0]);
            for(var i = 0; i < $scope.main.num_channels[launch_name]; i++){
              $scope.main.graphData[launch_name][i][0].push($scope.main.telemData[launch_name][i].slice(-1)[0]);
            }
          } else {
            $scope.main.graphData[launch_name].timeStamps = $scope.main.telemData[launch_name].slice(iterate_val);
            for(var j = 0; j < $scope.main.num_channels[launch_name]; j++){
              $scope.main.graphData[launch_name][j][0].push($scope.main.telemData[launch_name][j].slice(iterate_val));
            }
          }
        };

        // LETS DO SOME GRAPHS
        // now we need to make some scope variables that the view will use. Remember,
        // javascript passes primitive types by value but if we assign a scope variable
        // to an object like our liveVieInfo or telemData structs, we should be gucci
        $scope.main.updateViewForFlight = function(){
          $scope.main.currentStage = $scope.main.liveViewInfo[$scope.main.selected_launch_name].currentStage;
          $scope.main.anomolyCount = $scope.main.liveViewInfo[$scope.main.selected_launch_name].anomolyCount;
          $scope.main.telemError = $scope.main.liveViewInfo[$scope.main.selected_launch_name].telemError;
          $scope.main.messages = $scope.main.liveViewInfo[$scope.main.selected_launch_name].messages;
          $scope.main.healthy = $scope.main.liveViewInfo[$scope.main.selected_launch_name].healthy;
          $scope.main.graph.timeStamps = $scope.main.graphData[$scope.main.selected_launch_name].timeStamps;
          $scope.main.graphIterators = Array.from(Array($scope.main.num_channels[$scope.main.selected_launch_name]).keys());
          for(var j = 0; j < $scope.main.num_channels[$scope.main.selected_launch_name]; j++){
            $scope.main.graph[j] = $scope.main.graphData[$scope.main.selected_launch_name][j];
          }

          for(var g = 0; g < $scope.main.num_channels[$scope.main.selected_launch_name]; g++){
            $scope.main[$scope.main.channel_list[$scope.main.selected_launch_name][g]] = $scope.main.graphData[$scope.main.selected_launch_name][g].slice(-1)[0][0];
          }
        };

        socket.on('connect', function(data) {
            console.log("client connected");
        });

        socket.on('dataFile', function(data) {
          var msg = JSON.parse(data);
          var csvBlob = new Blob([msg.file], {type: 'text/csv'});
          var csvFileName = "launch_data_" + msg.launch_name + ".csv";
          $scope.main.downloadBlob(csvFileName, csvBlob);
        });

        /*
         * Submit the socket request for the raw CSV file data.
         */
        $scope.main.requestFlightDataAsCSV = function(flightName){
          socket.emit('getCSV',{
             launch_name: flightName
          });
        };

        socket.on('from:kythera', function(message){
            message = JSON.parse(message);
            console.log("Message from Kythera: " + message);

            // update number of online ppl
            $scope.main.num_online = message.num_online;

            if($scope.main.telemData[message.launch_name] === undefined){
              $scope.main.generateArrays(message.launch_name, message.channels, message.units, message.num_channels, message.chnParseChar); //if we have never seen this launch name, we need to generate its data arrays
            }

            // convert to string and parse TODO: not necessary?
            // message.data = message.data.toString()
            if(message.data.substring(0,2)!== $scope.main.liveViewInfo[message.launch_name].currentStage){
               $scope.main.liveViewInfo[message.launch_name].lastStateChange = new Date();
            }

            $scope.main.liveViewInfo[message.launch_name].last_packet_time = new Date(message.time);
            // add to the raw data stream
            var newRaw = {};
            newRaw.time = $scope.main.liveViewInfo[message.launch_name].last_packet_time;
            newRaw.msg = message;
            $scope.main.downlinkStream[message.launch_name].push(newRaw);

            // DOWNLINK FORMAT:
            // index 0 -> 1: Vehicle state (pre-defined integer between 0 -> 99)
            // index 2: Message type (D: derective sent to chat window)
            //                       (K: data message to be parsed)
            //                       (N: node health report)
            // if Derective:
            //    index 3 -> EOM: message string to be displayed
            // if Data message: ('.' character has an infered position)
            //    index 3 -> EOM: data downlink parsed by the flight parse character
            //if Node Health report:
            //    index 3 -> 4: node ID xx
            //    index 5 -> 6: bool health x
            //
            var data_list = message.data.split($scope.main.parseChars[$scope.main.selected_launch_name]);
            $scope.main.liveViewInfo[message.launch_name].currentStage = data_list[0];
            // add the message to our model locally
            if(data_list[1] === "D"){
              $scope.main.liveViewInfo[message.launch_name].messages.push({
                source:"/images/kythera.png",
                name: "Kythera",
                message: data_list[2],
                time: $scope.main.liveViewInfo[message.launch_name].last_packet_time
              });
            }else if(data_list[1] === "K"){
              var checksum = 0;
              var last_sum = 0;
              for(var g = 2; g < $scope.main.num_channels[$scope.main.selected_launch_name]; g++){
                checksum += parseInt(data_list[g]);
                $scope.main.telemData[message.launch_name][g].push(parseInt(data_list[g]));
                last_sum = parseInt(data_list[g]);
              }
              $scope.main.telemData[message.launch_name].timeStamps.push($scope.main.liveViewInfo[message.launch_name].last_packet_time.toTimeString().substring(3,9));

              // generate and check the checksum
              if(checksum !== last_sum){
                 $scope.main.liveViewInfo[message.launch_name].telemError = true;
              }else{
                 $scope.main.liveViewInfo[message.launch_name].telemError = false;
              }
              $scope.main.updateGraphs(message.launch_name);
            }else if(data_list[1] === "N"){
              console.log("unimplemented node health report");
            }else if(data_list[1] === "A"){
              $scope.main.reportingAnomolies[message.launch_name].push(data_list[2]);
              $scope.main.liveViewInfo[message.launch_name].anomolyCount += 1;
            }
        });

        setInterval(function(){
            $scope.$apply( function(){
              if ($scope.main.subscribed && $scope.main.liveViewInfo[$scope.main.selected_launch_name].last_packet_time !== null){
                var right_now = new Date();
                var delay = (right_now.getTime() - $scope.main.liveViewInfo[$scope.main.selected_launch_name].last_packet_time.getTime())/1000;
                if(delay > 10){
                  $scope.main.healthy = false;
                } else{
                  $scope.main.healthy = true;
                }
              }
            });
        }, 3000);

        $scope.main.send = function(toSend){
            socket.emit('from:controller',{
               message: toSend,
               flightName: $scope.main.selected_launch_name
            });
            console.log("User sending: " + toSend + " to port: " + $scope.main.devPath);
        };

        //RESTRICT TO LOGIN SCREEN
        $rootScope.$on( "$routeChangeStart", function(event, next, current) {
          if (!$scope.main.here) {
            $scope.main.viewSideBar = false;
            // user isn't logged in, redirect to /login-register unless already there
            if (next.templateUrl !== "components/login-register/login-registerTemplate.html") {
                  $location.path("/login-register");
            }
          }
        });

        $scope.main.showSuccess = function(){
          $('#registrationSuccessModal').modal();
        }

        $scope.main.showActivateSuccess = function(){
          $('#activationSuccessModal').modal();
        }

        $scope.main.activationError = function(){
          $scope.main.errorMsg = "There was an error in updating the flight status and you may have to re-register this flight. " + JSON.parse(this.responseText);
          $('#errorModal').modal();
        };

        $scope.main.alertGeneration = function(){
          $scope.main.alertMessage = "Generating & downloading flight report";
          $('#alertModal').modal();
        }

        $scope.main.emailErrorRecp = function(){
          $scope.main.errorMsg = "No recipient specified";
          $('#errorModal').modal();
        }

        $scope.main.emailLaunchMessage = function(fileNames){
          $scope.main.alertMessage = "Opening mail client. Please drag in the flight report files as attachments ("+ fileNames + ")";
          $('#alertModal').modal();
        }

        $scope.main.confirmRemoval = function(launch_name, type){
          $scope.main.launchToDelete = launch_name;
          $scope.main.statusToDelete = type;
          $('#confirmModal').modal();
        };

        $scope.main.controlFligt = function(flight){
          $scope.main.flightToControl = flight;
          if(flight.status === "idle"){
            $('#selectModal').modal();
          }else{
            $('#overrideModal').modal();
          }
        };

        /////
        //
        //  DATE FORMATING
        //
        /////

        //Make formatted time available to all sub controllers
        /* Create arrays containing names od days and names of months */
        var weekday = new Array(7);
        weekday[0]=  "Sunday";
        weekday[1] = "Monday";
        weekday[2] = "Tuesday";
        weekday[3] = "Wednesday";
        weekday[4] = "Thursday";
        weekday[5] = "Friday";
        weekday[6] = "Saturday";

        var months = new Array(12);
        months[0]=  "January";
        months[1] = "February";
        months[2] = "March";
        months[3] = "April";
        months[4] = "May";
        months[5] = "June";
        months[6] = "July";
        months[7] = "August";
        months[8] = "September";
        months[9] = "October";
        months[10] = "November";
        months[11] = "December";

        /* constructs the date in a more readable form returns it as a string */
        $scope.main.formatTime = function(passed, includeTime){
          var d = new Date(passed);
          var day = weekday[d.getDay()];
          var month = months[d.getMonth()];
          var date = d.getDate().toString();
          var year = d.getFullYear().toString();
          var time;

          /* include leading 0 to minutes below 10 */
          var minute = (d.getMinutes() < 10) ? "0" + d.getMinutes().toString() : d.getMinutes().toString();
          var seconds = (d.getSeconds() < 10) ? "0"+ d.getSeconds().toString() : d.getSeconds().toString();

          /* distinguish between AM and PM */
          var hour = d.getHours();
          if(hour < 13){
            /* 12 am is a special case here since it is returned as a 0 but 00 is not an acceptable format */
            if (hour === 0){
              time = "12" + ":" + minute + " AM";
            }
            /* all other times under 10am require a leading 0 */
            else{
              time = (hour < 10)? "0" + hour.toString() + ":" + minute + ":" + seconds +" am" : hour.toString() + ":" + minute + ":" + seconds + " am";
            }
          } else{
            /* pm times must be in 12 hour format and times under 10 must have a leading 0*/
            hour -= 12;
            time = (hour < 10)? "0" + hour.toString() + ":" + minute + ":" + seconds +" pm" : hour.toString() + ":" + minute + ":" + seconds + " pm";
          }

          /* return the formatted stirng */
          if(includeTime){
            return day + ", " + month + " " + date + ", " + year + " " + "at "  + time;
          }
          return day + ", " + month + " " + date + ", " + year;

        };

    }]);
