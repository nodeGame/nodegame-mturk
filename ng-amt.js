#!/usr/bin/env node

"use strict";

// General.
const fs = require('fs-extra');
const path = require('path');
const _ = require('underscore');
const J = require('JSUS').JSUS;

// Commander.
/////////////

let program = require('./lib/core/program');
program.parse(process.argv);

// Winston logger.
//////////////////

let logger = require('./lib/core/logger')(program);

// Load and check config.
/////////////////////////

let cfg = require('./lib/core/config')(program);
if (!cfg) return;

// VORPAL COMMANDS
//////////////////
let vorpal = require('./lib/core/vorpal');


// DEFAULT ACTION (from program)
////////////////////////////////

var codes;
let opts = program.opts();
if (opts.inputCodesFile || opts.resultsFile || opts.game) {
    codes = require('./lib/core/codes');
    if (opts.inputCodesFile) {
        opts.path = opts.inputCodesFile;
        codes.loadInputCodes(opts);
    }
    if (opts.resultsFile) {
        opts.path = opts.resultsFile;
        codes.loadResults(opts);
    }
}
var args;
args = {};
if (opts.getLastHITId) args.getLastHITId = true;
if (opts.getQualificationTypeId) args.getQualificationTypeId = true;
if (args.getLastHITId || opts.getQualificationTypeId) opts.connect = true;

// Async operations needs to be completed before the first prompt.
if (opts.connect) {
    require('./lib/core/api').connect(args, function() {
        if (opts.game) {
            loadGame(startVorpal);
        }
        else {
            startVorpal();
        }
    });
}
else if (opts.game) {
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
    opts.path = opts.game;
    // The limit parameter is the next after the game.
    let indexLimit = opts.rawArgs.indexOf(opts.game) + 1;
    opts.limit = opts.rawArgs[indexLimit];
    codes.loadGame(opts, cb);
}

// Do we need to export it?
// module.exports.stuff = stuff;
