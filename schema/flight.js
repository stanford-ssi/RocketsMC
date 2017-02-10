"use strict";
/*
 *  Defined the Mongoose Schema and return a Model for a User
 */
/* jshint node: true */

var mongoose = require('mongoose');

/*
 * Flights can have list of photos
 */
var associatedPhotoSchema = new mongoose.Schema({
    date_time: {type: Date, default: Date.now}, // The date and time when the photo was created
    file_name: String    // The file name of the photo associated with this flight
});

/*
 * Flights that fly Kythera can have their data uploaded
 *
 * NOTE: Each member of the schema represents an array of data, but,
 *       for convenience, is uploaded to the database as a String using
 *       the js toString function for Array types.
 *       This turns an array of [0,1,2,3,4] to "1,2,3,4"
 *       An array can be recovered from this string representation if the
 *       client requests the data, just use string.split(',');
 */
var flightDataSchema = new mongoose.Schema({
    timeStamps: String,
    atm: String,
    rollrate: String,
    pitch: String,
    yaw: String,
    az: String,
    ay: String,
    ax: String,
    temp: String,
    badPacketCount: Number // not an array. simply number of packets with mismatching checksums
});

// create a schema
var flightSchema = new mongoose.Schema({
    id: String,     // Unique ID identifying the flight
    launch_name: String, // Unique Login name for this flight
    launch_date: {type: Date, default: Date.now}, // The date and time of the flight
    launch_objectives: String,
    rocket_name: String,
    launcher: String,
    launch_location: String,
    rocket_description: String,
    organization: String,
    dimensions: String,
    materials: String,
    motor: String,
    avionics: String,
    payload_description: String,
    notes: String,
    status: String, // "non-Kythera":no-Kythera, "idle":Kythera registered but downlink not active, "active":downlink is active, "complete":data saved to mongodb
    msgParseChar: String, // character that seperates downlink messages
    chnParseChar: String, // character that seperates channels
    channels: String, // comma delimited string of the channel names
    units: String, // comma delimited string of the units by channel
    states: String, //comma delimited string of channel descriptions
    portName: String,
    baudRate: String,
    flightData: flightDataSchema,
    photos: [associatedPhotoSchema]  // TODO: no support for photos yet
});

// the schema is useless so far
// we need to create a model using it
var Flight = mongoose.model('Flight', flightSchema, 'Flight');

// make this available to our users in our Node applications
module.exports = Flight;
