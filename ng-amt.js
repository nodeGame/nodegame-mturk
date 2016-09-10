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
program = require('./lib/core/program');
program.parse(process.argv);

// Winston logger.
//////////////////

var logger;
logger = require('./lib/core/logger')(program);

// Load and check config.
/////////////////////////

var cfg;
cfg = require('./lib/core/config')(program);
if (!cfg) return;

// VORPAL COMMANDS
//////////////////
var vorpal;
vorpal = require('./lib/core/vorpal');


// DEFAULT ACTION (from program)
////////////////////////////////

if (program.inputCodesFile) stuff.codes.loadInputCodes(program);
if (program.resultsFile) stuff.codes.loadResults(program);

var options, api;
if (program.connect) {
    options = {};
    if (program.lastHITId) options.getLastHITId = true;
    if (program.getQualificationTypeId) options.getQualificationTypeId = true;

    api = require('./lib/core/api');
    api.connect(options, function() {
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


// Do we need to export it?
// module.exports.stuff = stuff;
