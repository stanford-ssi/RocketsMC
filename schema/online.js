"use strict";
/*
 *  Defined the Mongoose Schema and return a Model for a User
 */
/* jshint node: true */

var mongoose = require('mongoose');

// create a schema
var onlineSchema = new mongoose.Schema({
    id: String,     // Unique ID identifying the online user
    login_name: String, // Unique Login name for this online user
    first_name: String, // First name of the online user.
});

// the schema is useless so far
// we need to create a model using it
var Online = mongoose.model('Online', onlineSchema, 'Online');

// make this available to our users in our Node applications
module.exports = Online;
