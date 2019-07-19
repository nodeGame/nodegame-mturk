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
if (program.inputCodesFile || program.resultsFile || program.game) {
    codes = require('./lib/core/codes');
    if (program.inputCodesFile) codes.loadInputCodes(program);
    if (program.resultsFile) codes.loadResults(program);
}
var args;
args = {};
if (program.getLastHITId) args.getLastHITId = true;
if (program.getQualificationTypeId) args.getQualificationTypeId = true;
if (args.getLastHITId || program.getQualificationTypeId) program.connect = true;

// Async operations needs to be completed before the first prompt.
if (program.connect) {
    require('./lib/core/api').connect(args, function() {
        if (program.game) {
            loadGame(startVorpal);
        }
        else {
            startVorpal();
        }
    });
}
else if (program.game) {
    loadGame(startVorpal);    
}
else {
    startVorpal();
}

// Helper methods.

function startVorpal() {
    vorpal
        .delimiter('ng-amt$')
        .show();
}

function loadGame(cb) {
    // TODO: fix parameter naming.
    program.path = program.game;
    program.limit = program.rawArgs[4];
    codes.loadGame(program, cb);
}

// Do we need to export it?
// module.exports.stuff = stuff;
