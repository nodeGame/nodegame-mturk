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

var codes;
if (program.inputCodesFile || program.resultsFile) {
    codes = require('./lib/modules/codes');
    if (program.inputCodesFile) codes.loadInputCodes(program);
    if (program.resultsFile) codes.loadResults(program);
}

var options;
if (program.connect) {
    options = {};
    if (program.getLastHITId) options.getLastHITId = true;
    if (program.getQualificationTypeId) options.getQualificationTypeId = true;

    require('./lib/core/api').connect(options, function() {
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
