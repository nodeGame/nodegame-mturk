#!/usr/bin/env node

"use strict";

// General.
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');
var J = require('JSUS').JSUS;

// Commander.
/////////////

var program;
program = require('./lib/program');
program.parse(process.argv);

// Winston logger.
//////////////////

var logger;
logger = require('./lib/logger')(program);

// Load and check config.
/////////////////////////

var cfg;
cfg = require('./lib/config')(program);
if (!cfg) return;

// Load shared methods.
//////////////////////

var stuff = {};
stuff.codes = require('./lib/codes');
stuff.api = require('./lib/mturk-api');
stuff.manageHIT = require('./lib/manageHIT');
stuff.get = require('./lib/get');
stuff.qualification = require('./lib/qualification');

module.exports.stuff = stuff;

// VORPAL COMMANDS
//////////////////
var vorpal;
vorpal = require('./lib/vorpal');


// DEFAULT ACTION (from program)
////////////////////////////////

if (program.inputCodesFile) stuff.codes.loadInputCodes(program);
if (program.resultsFile) stuff.codes.loadResults(program);

if (program.connect) {
    var options = {};
    if (program.lastHITId) options.getLastHITId = true;
    if (program.getQualificationTypeId) options.getQualificationTypeId = true;

    connect(options, function() {
        vorpal
            .delimiter('ng-amt$')
            .show();
    });
}
else {
    vorpal
        .delimiter('ng-amt$')
        .show();
}
