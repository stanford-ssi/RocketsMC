"use strict";

/* jshint node: true */

// THIS CODE JUST LETS US FORMAT DATES NICE CAN BE IGNORED

var w = new Array(7); w[0]=  "Sunday"; w[1] = "Monday"; w[2] = "Tuesday";
w[3] = "Wednesday"; w[4] = "Thursday"; w[5] = "Friday"; w[6] = "Saturday";
var m = new Array(12); m[0]=  "January"; m[1] = "February"; m[2] = "March";
m[3] = "April"; m[4] = "May"; m[5] = "June"; m[6] = "July"; m[7] = "August";
m[8] = "September"; m[9] = "October"; m[10] = "November"; m[11] = "December";
var time = function(forFile){
  var d = new Date(); var day = w[d.getDay()]; var month = m[d.getMonth()];
  var date = d.getDate().toString(); var year = d.getFullYear().toString();
  var time; var minute = (d.getMinutes()<10)?"0"+d.getMinutes().toString():d.getMinutes().toString();
  var hour = d.getHours();
  if(hour < 13){
    if (hour === 0){ time = "12" + ":" + minute + " AM";}
    else{ time = (hour < 10)? "0" + hour.toString() + ":" + minute + " am" : hour.toString() + ":" + minute + " am";}
  } else{ hour -= 12;
    time = (hour < 10)? "0" + hour.toString() + ":" + minute + " pm" : hour.toString() + ":" + minute + " pm";
  }
  if(forFile !== true){
    return day + ", " + month + " " + date + ", " + year + " " + "at "  + time;
  }else {
    return month + "_" + date + "_" + year + "_" + time;
  }
};

// OK BACK TO ACTUAL STUFF

/*
 * This builds on the webServer of previous projects in that it exports the current
 * directory via webserver listing on a hard code (see portno below) port. It also
 * establishes a connection to the MongoDB named 'cs142project6'.
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch any file accessible
 * to the current user in the current directory or any of its children.
 *
 *
 */

var mongoose = require('mongoose');
var async = require('async');

// Load the Mongoose schema for Flight, Photo, Online, and SchemaInfo
var Flight = require('./schema/flight.js');
var Photo = require('./schema/photo.js');
var SchemaInfo = require('./schema/schemaInfo.js');
var Online = require('./schema/online.js');

// some extra libraries we'll be using
var session = require('express-session');
var bodyParser = require('body-parser');
var multer = require('multer');
var fs = require("fs");
var express = require('express');
var app = express();

// configure body parsing and session libraries
app.use(session({secret: 'secretKey', resave: false, saveUninitialized: false}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
var processFormBody = multer({storage: multer.memoryStorage()}).single('uploadedphoto');

//connect to our DB
mongoose.connect('mongodb://localhost/kytheraDB');

// We have the express static module (http://expressjs.com/en/starter/static-files.html) do all
// the work for us.
app.use(express.static(__dirname));

// Set up the Logging File and an array of Flight Events and Raw Downlink Files
var logpath = "./files/rocketsMCHistory/recentSession.txt";
var log = fs.createWriteStream(logpath);
log.write("\n\nStarting new session\n" + time(false) + "\n");
var rawDataCSVs = {}; // an association of flight names to downlink CSV's
var flightEventTXTs = {}; // an association of flight names to txt files that track flight events

app.get('/', function (request, response) {
     response.sendfile(__dirname + '/index.html');
});

// Server Initialization...we should probably use the under the hood html object
// which express wraps over  but since the raw object is returned by app.listen,
// we can probably get away  with calling io.on() before io can totally be created.
var io = require('socket.io');
var server = app.listen(3000, '0.0.0.0', function () {
    var port = server.address().port;
    log.write('Server is online ... \nListening at http://localhost:' + port + ' exporting the directory ' + __dirname + ' ...\n');
});
var socketServer = io(server);
var socket_ids = [];

// Let's set up the serial port array now
var serialport = require('serialport');// include the library
var SerialPort = serialport.SerialPort; // make a local instance of it
// get port name from the command line with $ ls /dev/tty.*
// previously used port names: '/dev/tty.usbserial-A1011FUN', '/dev/tty.usbserial-DN00OK9Z';
// maintain a list of open ports TODO: we probably don't need this
// var myPorts = [];
var portPerFlight = {}; // Each flight can only have 1 associated serial port (create a second flight to track a payload)
var launchNamePerPortPath = {}; //We also need to associate flight name with port name
var channelParseCharPerFlight = {}; //keep track of what parse char should be used to delim raw downlink data
var channelsPerFlight = {};
var unitsPerFlight = {};
var numChannelsPerFlight = {};
var parseCharPerChannel = {};
var statesPerFlight = {};
var dataFileNames = {};

// We maintain a list of clients (sockets) that should be forwarded data using rooms.
// The client must select an active kythera flight or be the flight controller
// for an active kythera flight. Read http://socket.io/docs/rooms-and-namespaces/
// to get some background on how we use socket "rooms" to group relevent clients
// TODO: We should really cut down on excessive socket messages by only sending data
//       to the client if they are "subscribed" to a specific port based on flight
//       For now, we'll be a little hacky and take care of this on the client side:
//       We'll send the port name with the message so the client can decide if they should
//       listen.

function setupTrackingFiles(launch_name, portName, chnParseChar, channels, units, states) {
  channelParseCharPerFlight[launch_name]=chnParseChar;
  rawDataCSVs[launch_name] = fs.createWriteStream('./files/rawDownlinks/'+launch_name+'.csv');
  dataFileNames[launch_name] = './files/rawDownlinks/'+launch_name+'.csv';
  channelsPerFlight[launch_name] = channels;
  unitsPerFlight[launch_name] = units;
  parseCharPerChannel[launch_name] = chnParseChar;
  statesPerFlight[launch_name] = states;

  var channel_list = channels.split(',');
  var unit_list = units.split(',');
  var num_elems = channel_list.length-1; //subtract 1 since we have a trailing comma
  numChannelsPerFlight[launch_name] = num_elems;
  rawDataCSVs[launch_name].write("Timestamp (MM:SS),");
  for (var i = 0; i < num_elems; i++) {
    rawDataCSVs[launch_name].write(channel_list[i]+" ("+unit_list[i]+"),");
  }
  rawDataCSVs[launch_name].write("\n");
  flightEventTXTs[launch_name] = fs.createWriteStream('./files/flightEvents/'+launch_name+'.txt');
  flightEventTXTs[launch_name].write("Starting new logging session\n" + time()  + "\n");
}

function setupHandlers(port) {
  // Add some listeners for when the port is opened, gets an error, and closed
  port.on('open', function() {
      console.log('Port ' + port.path + ' open. Data rate: ' + port.options.baudRate);
      flightEventTXTs[launchNamePerPortPath[port.path]].write("\nPort " + port.path + " open. Listening for Kythera at data rate: " + port.options.baudRate + "\n");
  });
  port.on('error', function(error) {
     console.log('Serial port error: ' + error);
     flightEventTXTs[launchNamePerPortPath[port.path]].write('\nSerial port error: ' + error);
  });
  port.on('close', function() {
     console.log(port.path + " closed.");
     flightEventTXTs[launchNamePerPortPath[port.path]].write('\n\nSession complete for device: ' + port.path + '\n\n');
  });
  // Define behaviors for when we recieve data:
  port.on('data', function(data) {
    // build an object to send to clients
    var toSend = {};
    toSend.num_online = socket_ids.length;
    toSend.data = data;
    toSend.path = port.path;
    toSend.launch_name = launchNamePerPortPath[port.path];
    toSend.time = new Date();
    toSend.channels = channelsPerFlight[toSend.launch_name];
    toSend.units = unitsPerFlight[toSend.launch_name];
    toSend.chnParseChar = parseCharPerChannel[toSend.launch_name];
    toSend.num_channels = numChannelsPerFlight[toSend.launch_name];
    io.to('subscribedClients').emit('from:kythera', JSON.stringify(toSend)); // send the data to all subscribed clients

    // log on the server side for persistence
    flightEventTXTs[launchNamePerPortPath[port.path]].write("\nRecieved message from flight: " + toSend.launch_name +" On port : " + port.path +  " at " + toSend.time + "\n");
    if(data.charAt(3) === "K"){
      rawDataCSVs[launchNamePerPortPath[port.path]].write(new Date().toTimeString().substring(3,9)+",");
      if(channelParseCharPerFlight[launchNamePerPortPath[port.path]] !== ","){
        rawDataCSVs[launchNamePerPortPath[port.path]].write(data.replace(channelParseCharPerFlight[launchNamePerPortPath[port.path]], ","));
      }else{
        rawDataCSVs[launchNamePerPortPath[port.path]].write(data);
      }
      rawDataCSVs[launchNamePerPortPath[port.path]].write("\n");
      flightEventTXTs[launchNamePerPortPath[port.path]].write("<data message>");
    }else if(data.charAt(3) === "D"){
      flightEventTXTs[launchNamePerPortPath[port.path]].write(data);
    }
  });
}

function addPort(flightName, portName, baudRate, msgParseChar){
  console.log("Setting up port: " + portName + " at: " + baudRate);
  log.write("\nSetting up port: " + portName + " at: " + baudRate);
  var port = new SerialPort(portName, {
      baudrate:baudRate,
      // look for return and newline at the end of each data packet.
      // '\n' must be sent by the XBEE to generate a new event
      parser: serialport.parsers.readline(decodeURIComponent(msgParseChar))
  },function (err) {
    if (err) {
      return console.log('Error: ', err.message);
    }
  });

  setupHandlers(port);
  portPerFlight[flightName] = port;
  launchNamePerPortPath[port.path] = flightName;
}

socketServer.on('connection', function(socket){
  console.log('User ' + socket.id + ' connected');
  if(socket_ids.indexOf(socket.id) < 0){ // add the user to our list of users if they have never been here
    socket_ids.push(socket.id);
    log.write('\nUser ' + socket.id + ' connected\n');
  }

  socket.on('disconnect', function(){
     socket.leave('subscribedClients'); //not sure if this will break it
     console.log('User ' + socket.id + ' disconnected');
     socket_ids.splice(socket_ids.indexOf(socket.id), 1);
     log.write('\nUser ' + socket.id + ' disconnected\n');
  });

  // this function runs if there's input from the client
	socket.on('from:controller', function(data) {
    var portToWriteTo = portPerFlight[data.flightName];
    portToWriteTo.write(data.message);  // send the data to the correct serial device
    console.log("Sent message to device: " + portToWriteTo.path);
    log.write("\nSent message to device: " + portToWriteTo.path + " at: " + time() + ":\n"+data.message + "\n");
    flightEventTXTs[data.flightName].write("\nSent message to device: " + portToWriteTo.path + " at: " + time() + ":\n"+data.message + "\n");
	});

  // let the client request to recieve downlink data
  socket.on('subscribeToDownlink', function() {
    socket.join('subscribedClients');
  });

  // let the client request to recieve downlink data
  socket.on('getCSV', function(requestedFlight) {
    fs.readFile(dataFileNames[requestedFlight.launch_name], 'utf8', function(err, contents) {
      var toSend = {};
      toSend.file = contents;
      toSend.launch_name = requestedFlight.launch_name;
      socket.emit('dataFile', JSON.stringify(toSend));
    });
  });
});

/*
 **********
 *
 *   Respond to certain URL GET's
 *
 **********
 */

 /*
  * Use GET to let client side access the numer of active sessions
  */
  app.get('/online', function (request, response) {
      console.log("SERVING up: " + socket_ids.length);
      response.status(200).send(JSON.stringify(socket_ids.length));
  });

  /*
   * URL /user/list - Return all the Flight objects.
   */
  app.get('/flight/listAll', function (request, response) {
    Flight.find(function(err, flights) {
      var flightNames = [];
      var flightsCopy = JSON.parse(JSON.stringify(flights));
      console.log(flightsCopy);
      response.status(200).send(JSON.stringify(flightsCopy));
    });
  });

  /*
   * URL /user/list - Return all the non Kythera flight objects.
   */
  app.get('/flight/listNonKythera', function (request, response) {
      Flight.find(function(err, flights) {
        var flightNames = [];
        var flightsCopy = JSON.parse(JSON.stringify(flights));

        /* for each user we generate a count of their photos and comments */
        async.each(flightsCopy, function (oneFlight, done_callback) {
          if(oneFlight.status === "non-Kythera"){
            flightNames.push(oneFlight);
          }
          /*done callback sends the structure off! */
          done_callback(err);
        }, function (err) {
            if (err) {
                response.status(500).send(JSON.stringify(err));
            }
            response.end(JSON.stringify(flightNames));
      });
    });
  });

  /*
   * URL /user/list - Return all the active Kythera flight objects.
   */
  app.get('/flight/listActive', function (request, response) {
      Flight.find(function(err, flights) {
        var flightNames = [];
        var flightsCopy = JSON.parse(JSON.stringify(flights));

        /* for each user we generate a count of their photos and comments */
        async.each(flightsCopy, function (oneFlight, done_callback) {
          if(oneFlight.status === "active" || oneFlight.status === "idle"){
            flightNames.push(oneFlight);
          }
          /*done callback sends the structure off! */
          done_callback(err);
        }, function (err) {
            if (err) {
                response.status(500).send(JSON.stringify(err));
            }
            response.end(JSON.stringify(flightNames));
      });
    });
  });

  /*
   * URL /user/list - Return all past Kythera flight objects with their data
   */
  app.get('/flight/listComplete', function (request, response) {
      Flight.find(function(err, flights) {
        var flightNames = [];
        var flightsCopy = JSON.parse(JSON.stringify(flights));

        /* for each user we generate a count of their photos and comments */
        async.each(flightsCopy, function (oneFlight, done_callback) {
          if(oneFlight.status === "complete"){
            flightNames.push(oneFlight);
          }
          /*done callback sends the structure off! */
          done_callback(err);
        }, function (err) {
            if (err) {
                response.status(500).send(JSON.stringify(err));
            }
            response.end(JSON.stringify(flightNames));
      });
    });
  });

  /*
   **********
   *
   *   Respond to certain URL POST's
   *
   **********
   */

  /*
   * Use POST to let client side remove a serial port with a specific device name
   */
  app.post('/downlink/remove-serial', function(request, response){
    var portToWriteTo = portPerFlight[request.body.flightName];
    /*var numPorts = myPorts.length;
    var found = false;
    var foundIndex = 0;
    for (var i = 0; i < numPorts; i++) {
        if(myPorts[i].path === request.body.portName){
          foundIndex = i;
          found = true;
        }
    }*/
    if(portToWriteTo !== undefined){ // this is a little ugly but jshint doesn't want us to define the close callback in the loop
      portToWriteTo.close(function (err) {
        if(err){
          response.status(400).send(JSON.stringify("There was a problem closing the port: " + err));
          return;
        }
        // the close was successful so remove the port from the array
        //myPorts.splice(foundIndex, 1);
        portPerFlight[request.body.flightName] = null;
        response.status(200).send("Port removed");
      });
    } else{
      response.status(400).send(JSON.stringify("The requested port does not exist"));
    }
  });

  /*
   * Use POST to let client add an RX radio
   * This might not be necessary
   */
  app.post('/downlink/new-serial', function(request, response){
      addPort(request.body.portName, request.body.baudRate, request.body.parseChar);
      response.status(200).send();
  });

  /*
   *  Use POST to let a client mark a flight as active. This means we should begin
   *  saving data for this flight on the server. We'll send a bad response if the RX
   *  is not configured or can't be connected to.
   */
   app.post('/flight/activate', function (request, response) {
     //find and return the relevant flight
     Flight.findOne({launch_name : request.body.launch_name}, function(err, flight) {
       if (err) {
           console.error('/flight/:id error:', err);
           response.status(400).send(JSON.stringify(err));
           return;
       }
       if(flight){
         if(flight.status == "idle"){ //if the user is configuring a serial port
           // make the requisite tracking files
           setupTrackingFiles(flight.launch_name, flight.portName, flight.baudRate, flight.chnParseChar, flight.channels, flight.units, flight.states);
           var port = new SerialPort(flight.portName, {
               baudrate:flight.baudRate,
               // look for return and newline at the end of each data packet.
               // '\n' must be sent by the XBEE to generate a new event
               parser: serialport.parsers.readline(decodeURIComponent(flight.msgParseChar))
           },function (err) {
             if (err) {
               response.status(400).send(JSON.stringify("Invalid Serial Port: " + flight.portName));
               return;
             } else{
               setupHandlers(port);
               portPerFlight[flight.launch_name] = port;
               launchNamePerPortPath[port.path] = flight.launch_name;
               flight.status = "active";
               flight.save();
               response.send();
             }
           });
         } else{
           console.log("here");
           response.status(700).send(JSON.stringify("Invalid flight status"));
         }
       }
     });
   });

  /*
   *  Use POST to let a client mark a flight as complete. This means we will stop
   *  saving data for this flight on the server. We'll send a bad response if the RX
   *  is not configured or can't be connected to.
   */
   app.post('/flight/complete', function (request, response) {
     //find and return the relevant flight
     Flight.findOne({launch_name : request.body.launch_name}, function(err, flight) {
       if (err) {
           console.error('/flight/:id error:', err);
           response.status(400).send(JSON.stringify(err));
           return;
       }
       if(flight){
         if(flight.status == "active"){ //if the flight has an active downlink
           if(portPerFlight[flight.launch_name] === undefined){
             var notification = "However, there was no serial port to close.";
             flight.status = "complete";
             flight.save();
             response.status(200).send(JSON.stringify(notification));
           }else{
             portPerFlight[flight.launch_name].close(function (err) {
               var notification = "";
               flight.status = "complete";
               flight.save();
               if(err){
                 notification = "However, there was a problem closing the serial port.";
               }
               portPerFlight[request.body.flightName] = null;
               response.status(200).send(JSON.stringify(notification));
             });
           }
         }
       }
     });
   });

  /*
   * Use POST to let client delete a flight
   */
  app.post('/flight/delete', function(request, response){
    console.log(request.body.launch_name);
    //get the user who has called the function
    Flight.remove({launch_name : request.body.launch_name}, function(err) {
      if (err) {
        console.error('Unable to delete the requested flight:', err);
        response.status(400).send(JSON.stringify(err));
      } else{
        console.log("deleted");
        // the flight was deleted so we don't need to associate the flight name and port
        launchNamePerPortPath[request.body.launch_name] = null;
        response.send();
      }
    });
  });

  /*
   * Use a POST request with the flight information in the body to make a new flight
   * object and add it to the model
   */
  app.post('/flight/create', function (request, response) {
    //find and return the relevant flight
    Flight.findOne({launch_name : request.body.launch_name}, function(err, flight) {
      if (err) {
          console.error('/flight/:id error:', err);
          response.status(400).send(JSON.stringify(err));
          return;
      }
      if(flight){
        response.status(400).send(JSON.stringify("This flight name already exists"));
        return;
      }

      var flight_status = "non-Kythera";
      if(request.body.kythera == "true"){
        flight_status = "idle";
      }

      Flight.create({ launch_name: request.body.launch_name, // Unique launch name for this flight
                      launch_date: request.body.launch_date,
                      launch_objectives: request.body.launch_objectives,
                      rocket_name: request.body.rocket_name,
                      launcher: request.body.launcher,
                      launch_location: request.body.launch_location,
                      rocket_description: request.body.rocket_description,
                      organization: request.body.organization,
                      dimensions: request.body.dimensions,
                      material: request.body.materials,
                      motor: request.body.motor,
                      avionics: request.body.avionics,
                      payload_description: request.body.payload_description,
                      notes: request.body.notes,
                      status: flight_status,
                      msgParseChar: decodeURIComponent(request.body.msgParseChar),
                      chnParseChar: decodeURIComponent(request.body.chnParseChar),
                      channels: decodeURIComponent(request.body.channels),
                      units: decodeURIComponent(request.body.units),
                      states: decodeURIComponent(request.body.states),
                      portName: decodeURIComponent(request.body.portName),
                      baudRate: request.body.baudRate,
                      photos: [] },
        function(err, newFlight){
          if(err){
            //report an error
            console.log("Unable to register new flight: " + request.body.launch_name);
            response.status(400).send(JSON.stringify("Unable to register new flight: " + request.body.launch_name + ". Please try again."));
            return;
          }
          //Log info about the flight we're adding
          console.log("Successfuly Created new Flight: " + request.body.launch_name + " with status: " + flight_status);
          response.send();
      });
    });
  });
