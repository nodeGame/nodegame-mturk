#!/usr/bin/env node

"use strict";

// General.
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');
var J = require('JSUS').JSUS;

// GLOBAL VARIABLES
////////////

// Config as loaded by file, and augmented by inline options.
var cfg;

// The api command after a connection has been established.
var api, shapi, options;

// Reference to the HITId and HIT object.
var HITId, HIT;

// Bonus/Results approval operations.
var bonusField, exitCodeField;
var sendNotification, qualificationId;


var totResults, totBonusPaid;
var nApproved, nRejected, nBonusGiven, nProcessed;
var errorsApproveReject, errorsBonus;


// GrantBonus
var bonusGranted, bonusProcessed;

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

if (program.inputCodesFile) {
    loadInputCodes(program);
}
if (program.resultsFile) {
    stuff.codes.loadResults(program);
}


if (program.connect) {
    options = {};
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

// END DEFAULT  ACTION
/////////////////////////////


// FUNCTIONS
////////////

/**
 * ### getAccountBalance
 *
 *
 *
 */
function getAccountBalance(args, cb) {
    if (!checkAPIandDB(cb, { results: false })) return;
    shapi.req('GetAccountBalance', {}, function(res) {
        if (cb) cb(res.GetAccountBalanceResult[0].AvailableBalance);
    });
}

/**
 * ### showAvailableAccountBalance
 *
 *
 *
 */
function showAvailableAccountBalance(args, cb) {
    getAccountBalance({}, function(balance) {
        logger.info((args.text || 'Your balance is: ') +
                    balance.FormattedPrice);
        if (cb) cb();
    });
}

/**
 * ### checkAPIandDB
 *
 *
 *
 */
function checkAPIandDB(cb, options) {
    var opts;
    opts = { api: true, results : true };
    J.mixin(opts, options);

    if (opts.api && (!api || !shapi)) {
        logger.error('api not available. connect first');
        if (cb) cb();
        return;
    }

    // Results db must exists and not be empty.
    if (opts.results && (!resultsDb || !resultsDb.size())) {
        logger.error('no results found. load a results file first.');
        if (cb) cb();
        return;
    }
    return true;
}

/**
 * ### prepareArgs
 *
 *
 *
 */
function prepareArgs(command, args, cb) {
    var res;

    if (command === 'grantBonus') {

        if (args.Reason &&
            ('string' !== typeof args.Reason || args.Reason.trim() === '')) {
            logger.error('--Reason must be non-empty string or undefined. ' +
                         'Found: ' + args.Reason);
            if (cb) cb();
            return;
        }

        if ('undefined' !== typeof args.UniqueRequestToken) {
            res = J.isInt(args.UniqueRequestToken, 0);
            if (res === false) {
                logger.error('--UniqueRequestToken must be a positive ' +
                             'integer. Found: ' + args.UniqueRequestToken);
                if (cb) cb();
                return;
            }
            args.UniqueRequestToken = res;
        }
        else {
            if ('undefined' === typeof cfg.UniqueRequestToken) {
                logger.warn('no --UniqueRequestToken and no value in config. ' +
                            'Will try to use value from results code.');
            }
            else {
                args.IntegerValue = cfg.IntegerValue;
            }
        }
    }

    else if (command === 'uploadResult') {

        if (args.RequesterFeedback &&
            ('string' !== typeof args.RequesterFeedback ||
             args.RequesterFeedback.trim() === '')) {

            logger.error('--RequesterFeedback must be a non-empty ' +
                         'string. Found: ' + args.RequesterFeedback);
            if (cb) cb();
            return;
        }

    }

    // Unknown.
    else {
        winston.err('prepareArgs: unknown command: ' + command);
        if (cb) cb();
        return;
    }

    return true;
}

/**
 * ### resetGlobals
 *
 *
 *
 */
function resetGlobals(command) {

    // Result.
    if (command === 'uploadResult') {
        nApproved = 0;
        nRejected = 0;
        nProcessed = 0;
        errorsApproveReject = [];
    }

    // Bonus.
    else if (command === 'grantBonus') {
        nBonusGiven = 0;
        totBonusPaid = 0;
        errorsBonus = [];
    }

    // Qualification.
    else if (command === 'assignQualification') {
    }

}
