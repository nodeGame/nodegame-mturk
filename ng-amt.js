#!/usr/bin/env node

"use strict";

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
try {
    cfg = require('./lib/core/config')(program);
    if (!cfg) return;
}
catch(e) {
    fatal(e);
}


// VORPAL COMMANDS
//////////////////
var vorpal;
try {
    vorpal = require('./lib/core/vorpal');
}
catch(e) {
    fatal(e);
}

// DEFAULT ACTION (from program)
////////////////////////////////

var codes;
try {
    if (program.inputCodesFile || program.resultsFile || program.game) {
        codes = require('./lib/core/codes');
        if (program.inputCodesFile) {
            program.path = program.inputCodesFile;
            codes.loadInputCodes(program);
        }
        if (program.resultsFile) {
            program.path = program.resultsFile;
            codes.loadResults(program);
        }
    }
}
catch(e) {
    fatal(e);
}

var args;
args = {};
if (program.getLastHITId) args.getLastHITId = true;
if (program.getQualificationTypeId) args.getQualificationTypeId = true;
if (args.getLastHITId || program.getQualificationTypeId) program.connect = true;

// Async operations needs to be completed before the first prompt.
try {
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
}
catch(e) {
    fatal(e);
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
    // The limit parameter is the next after the game.
    let indexLimit = program.rawArgs.indexOf(program.game) + 1;
    program.limit = program.rawArgs[indexLimit];
    codes.loadGame(program, cb);
}

function fatal(error) {
    logger.error('Ooops! A fatal error occurred:');
    console.log(error);
}

// Do we need to export it?
// module.exports.stuff = stuff;
