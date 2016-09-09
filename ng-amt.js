#!/usr/bin/env node

"use strict";

// General.
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');
var NDDB = require('NDDB').NDDB;
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
var validateLevel, validateParams;
var sendNotification, qualificationId;

var inputCodesFile, resultsFile;
var inputCodesErrors, resultsErrors;
var inputCodesDb, resultsDb;

var totResults, totBonusPaid;
var nApproved, nRejected, nBonusGiven, nQualificationGiven, nProcessed;
var errorsApproveReject, errorsBonus, errorsQualification;

// QualificationType Id;
var QualificationTypeId, QualificationType;

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

// VORPAL COMMANDS
//////////////////
var vorpal = require('vorpal')();

vorpal
    .command('connect')
    .action(connect);


vorpal
    .command('extendHIT', 'Extends the HIT.')
    .option('-a, --assignments [n]',
            'Adds n assigments to the HIT')
    .option('-t, --time [t]',
            'Adds extra t seconds to the HIT')
    .action(extendHIT);

vorpal
    .command('expireHIT', 'Expires the HIT')
    .action(expireHIT);

vorpal
    .command('loadResults', 'Loads a results file')

    .option('-r, --replace [resultsFile]',
            'Replaces current database')

    .option('-a, --append [resultsFile]',
            'Appends to current database')

    .option('-f, --resultsFile [resultsFile]',
            'Path to a codes file with Exit and Access Codes')

    .option('-v, --validateLevel <level>',/^(0|1|2)$/i, '2')

    .action(function(args, cb) {
        loadResults(args.options, cb);
    });


vorpal
    .command('loadInputCodes', 'Loads an input codes file')

    .option('-r, --replace [resultsFile]',
            'Replaces current database')

    .option('-a, --append [resultsFile]',
            'Appends to current database')

    .option('-f, --inputCodesFile [inputCodesFile]',
            'Path to a codes file with Exit and Access Codes')

    .option('-v, --validateLevel <level>',/^(0|1|2)$/i, '2')

    .option('-b, --bonusField [bonusField]',
            'Overwrites the name of the bonus field (default: bonus)')

    .option('-e, --exitCodeField [exitCodeField]',
            'Overwrites the name of the exit code field ' +
            '(default: ExitCode)')

    .action(function(args, cb) {
        loadInputCodes(args.options, cb);
    });

vorpal
    .command('uploadResults',
             'Uploads the results to AMT server (approval+bonus+qualification)')

    .option('-f, --RequesterFeedback <feedback>',
            'Optional requester feedback for the worker')

    .option('-q, --doQualification',
            'Also assign the qualification, if specified or found')

    .option('-Q, --QualificationTypeId',
            'Sets the qualification type id (overwrites previous values)')

    .option('-i, --IntegerValue',
            'Sets the integer value for the qualification (AMT default = 1)')

    .option('-n --SendNotification',
            'Sends a notification about qualification (AMT default = true')

    .option('-b, --doBonus', 'Also grant bonus, if found')

    .option('-t, --UniqueRequestToken [token]',
            'Unique token for one-time operations')

    .option('-r --Reason [reason]',
            'Sets the reason for the bonus')

    .action(function(args, cb) {
        uploadResults(args.options, cb);
    });

vorpal
    .command('grantBonus',
             'Grants bonuses as specified in results codes')

    .option('-t, --UniqueRequestToken [token]',
            'Unique token for one-time operations')

    .option('-r --Reason [reason]',
            'Sets the reason for the bonus')

    .action(function(args, cb) {
        grantAllBonuses(args.options, cb);
    });

vorpal
    .command('assignQualification',
             'Assigns a Qualification to all results codes')

    .option('-q --QualificationTypeId',
             'Specify the ID of the qualification (overwrites previous values)')

    .option('-i --IntegerValue [value]',
             'Sets the integer value for the qualification (AMT default = 1)')

    .option('-n --SendNotification',
            'Sends a notification about qualification (AMT default = true')

    .action(function(args, cb) {
        assignAllQualifications(args.options, cb);
    });

vorpal
    .command('get <what>', 'Fetches and stores the requested info')
    .autocomplete([ 'HITId', 'QualificationTypeId', 'AccountBalance' ])
    .action(function(args, cb) {
        if (args.what === 'HITId') {
            getLastHITId({}, cb);
        }
        else if (args.what === 'QualificationTypeId') {
            getQualificationType({}, cb);
        }

        else if (args.what === 'AccountBalance') {
            showAvailableAccountBalance({}, cb);
        }
        else {
            logger.warn('unknown "get" argument: ' + args.what);
            cb();
        }
    });

vorpal
    .command('show <what>', 'Prints out the requested info')

    .autocomplete(['Results', 'UploadStats', 'InputCodes', 'Config'])

    .option('-p, --position [position]', 'Position of result|input code in db')

    .action(function(args, cb) {
        var idx, config;

        if (args.what === 'Results') {
            if (!resultsDb || !resultsDb.size()) {
                logger.error('no results to show.');
            }
            else {
                idx = args.options.position || 0;
                this.log(resultsDb.get(idx));
            }
        }
        else if (args.what === 'InputCodes') {
            if (!inputCodesDb || !inputCodesDb.size()) {
                logger.error('no input codes to show.');
            }
            else {
                idx = args.options.position || 0;
                this.log(inputCodesDb.get(idx));
            }
        }

        else if (args.what === 'UploadStats') {
            showUploadStats();
        }

        else if (args.what === 'Config') {
            config = J.clone(cfg);
            config.resultsFile = resultsFile;
            config.inputCodesFile = inputCodesFile;
            config.nResults = resultsDb ? resultsDb.size() : 'NA';
            config.nInputCodes = inputCodesDb ? inputCodesDb.size() : 'NA';
            config.HITId = HITId || 'NA';
            config.QualificationTypeId = cfg.QualificationTypeId || 'NA';
            config.token = cfg.token || 'NA';
            config.api = api ? 'client created' : 'client **not** created';
            this.log(config);
        }
        else {
            logger.warn('unknown "show" argument: ' + args.what);
        }
        cb();
    });


// END VORPAL COMMANDS
//////////////////////


// DEFAULT ACTION (from program)
////////////////////////////////

if (program.inputCodesFile) {
    loadInputCodes(program);
}
if (program.resultsFile) {
    loadResults(program);
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
 * ### loadResults
 *
 *
 *
 */
function loadResults(args, cb) {

    // Checking options.

    // Append and replace db.
    if (args.append && args.replace) {
        logger.error('cannot append and replace results db at the same time.');
        if (cb) cb();
        return;
    }

    // Results File.
    resultsFile = args.resultsFile || cfg.resultsFile;
    if (!resultsFile) {
        logger.error('no results file provided.');
        if (cb) cb();
        return;

    }
    if (!fs.existsSync(resultsFile)) {
        logger.error('results file not found: ' + resultsFile);
        if (cb) cb();
        return;

    }
    logger.info('results file: ' + resultsFile);

    // Validate Level and Params.
    validateLevel = args.validateLevel || cfg.validateLevel;
    logger.info('validation level: ' + validateLevel);
    validateParams = {
        bonusField: cfg.bonusField,
        exitCodeField: cfg.exitCodeField
    };
    if (HITId) validateParams.HITId = HITId;

    // Setting up results database for import.

    if (resultsDb) {
        if (args.replace) {
            resultsDb = getResultsDB();
        }
        else if (!args.append) {
            logger.error('results db already found. ' +
                         'Use options: "replace", "append"');

            if (cb) cb();
            return;
        }
    }
    else {
        resultsDb = getResultsDB();
    }

    // Loading results file.
    resultsDb.loadSync(resultsFile, {
        separator: ',',
        quote: '"',
        headers: true
    });
    totResults = resultsDb.size();
    logger.info('result codes: ' + totResults);

    if (cb) cb();
    return true;
}

/**
 * ### loadInputCodes
 *
 *
 *
 */
function loadInputCodes(args, cb) {

    // Input Codes.
    inputCodesFile = args.inputCodesFile || cfg.inputCodesFile;
    if (!inputCodesFile) {
        if (!fs.existsSync(inputCodesFile)) {
            logger.error('input codes file not found: ' + inputCodesFile);
            if (cb) cb();
            return;
        }
    }
    logger.info('input codes: ' + inputCodesFile);
    if (inputCodesDb) {
        if (args.replace) {
            inputCodesDb = getInputCodesDB();
        }
        else if (!args.append) {
            logger.error('inputCodes db already found. ' +
                         'Use options: "replace", "append"');
            if (cb) cb();
            return;
        }
    }
    else {
        inputCodesDb = getInputCodesDB();
    }

    inputCodesDb.loadSync(inputCodesFile);
    logger.info('input codes: ' + inputCodesDb.size());
    if (inputCodesErrors.length) {
        logger.error('input codes errors: ' + inputCodesErrors.length);
        logger.error('correct the errors before continuing');
        if (cb) cb();
        return;
    }
    if (cb) cb();
    return true;
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
 * ### assignAllQualifications
 *
 *
 *
 */
function assignAllQualifications(args, cb) {
    var res, that;

    // Check API and DB.
    if (!checkAPIandDB(cb)) return;

    res = prepareArgs('assignQualification', args, cb);
    if (!res) return;

// if (nQualificationGiven || errorsQualification){
//     that = this;
//     return this.prompt({
//         type: 'confirm',
//         name: 'continue',
//     default: false,
//       message: 'That sounds like a really bad idea. Continue?',
//     }, function(result){
//       if (!result.continue) {
//         self.log('Good move.');
//         cb();
//       } else {
//         self.log('Time to dust off that resume.');
//         app.destroyDatabase(cb);
//       }
//     });
//   });
// }

    resetGlobals('assignQualification');

    // Do it!
    resultsDb.each(assignQualification, function(err) {
        if (++nProcessed >= totResults) {
            showUploadStats({ qualification: true }, cb);
        }
    }, args);

    return true;
}

/**
 * ### assignQualification
 *
 *
 *
 */
function assignQualification(data, cb, args) {
    var qid, params, err;
    args = args || {};

    // Qualification.
    qid = args.QualificationTypeId || data.QualificationTypeId;

    if (!qid) {
        err = 'no QualificationTypeId found. WorkerId: ' + data.WorkerId;
        logger.error(err);
        if (cb) cb(err);
        return;
    }

    params = {
        WorkerId: data.WorkerId,
        QualificationTypeId: qid
    };

    if ('number' === typeof args.IntegerValue) {
        params.IntegerValue = args.IntegerValue;
    }
    else {
        params.IntegerValue = data.IntegerValue;
    }

    if ('undefined' !== typeof args.SendNotification) {
        params.SendNotification = args.SendNotification;
    }
    else if ('undefined' !== typeof data.SendNotification) {
        params.SendNotification = data.SendNotification;
    }

    shapi.req('AssignQualification', params, function(res) {
        nQualificationGiven++;
        if (cb) cb();
    }, function (err) {
        errorsQualification.push(err);
        if (cb) cb(err);
    });

    return true;
}

/**
 * ### uploadResults
 *
 *
 *
 */
function uploadResults(args, cb) {
    var res, options;

    // Check API and DB.
    if (!checkAPIandDB(cb)) return;
    // Args.
    if (!prepareArgs('uploadResult', args, cb)) return;

    // Do bonus checkings.

    if (!args.doBonus) {
        if (args.Reason) {
            logger.error('--Reason is set, but --doBonus is not. Aborting.');
            if (cb) cb();
            return;
        }

        if (args.UniqueTokenRequest) {
            logger.error('--UniqueTokenRequest is set, but ' +
                         '--doBonus is not. Aborting.');
            if (cb) cb();
            return;
        }
    }
    else {
        res = prepareArgs('grantBonus', args, cb);
        if (!res) return;
    }

    // Do qualification checkings.

    if (!args.doQualification) {
        if (args.QualificationTypeId) {

            logger.error('--QualificationTypeId  is set, ' +
                         'but --doQualification is not. Aborting.');
            if (cb) cb();
            return;
        }
        if (args.IntegerValue) {

            logger.error('--IntegerValue  is set, ' +
                         'but --doQualification is not. Aborting.');
            if (cb) cb();
            return;
        }
        if (args.SendNotification) {

            logger.error('--SendNotification  is set, ' +
                         'but --doQualification is not. Aborting.');
            if (cb) cb();
            return;
        }
    }
    else {
        res = prepareArgs('assignQualification', args, cb);
        if (!res) return;
    }

    // All checkings done. Prepare global variables.

    resetGlobals('uploadResult');
    options = { 'uploadResult': true };

    if (args.doBonus) {
        resetGlobals('grantBonus');
        options.grantBonus = true;
    }
    if (args.doQualification) {
        resetGlobals('assignQualification');
        options.assignQualification = true;
    }

    getAccountBalance({}, function(balanceObj) {

        options.origAccountBalance = balanceObj;
        options.GetAccountBalance = true;

        // Do it!
        resultsDb.each(uploadResult, function(err) {
            if (++nProcessed >= totResults) {
                showUploadStats(options, cb);
            }
        }, args);
    });
    return true;
}

/**
 * ### uploadResult
 *
 *
 *
 */
function uploadResult(data, cb, args) {
    var id, wid, op, params, feedback;

    id = data.id;
    wid = data.WorkerId;

    if (data.Reject) {
        if (data[cfg.bonusField]) {
            logger.warn('Assignment rejected, but bonus found. WorkerId: ' +
                        wid);
        }
        op = 'Reject';
    }
    else {
        op = 'Approve';
    }

    params = { AssignmentId: data.AssignmentId };

    feedback = args.RequesterFeedback || data.RequesterFeedback;
    if (feedback) params.RequesterFeedback = feedback;

    shapi.req(op + 'Assignment', params, function() {
        // No bonus granting if assignment is rejected.
        if (op === 'Reject') {
            nRejected++;
        }
        else {
            nApproved++;

            if (args.bonus && data[cfg.bonusField]) {
                grantBonus(data, function() {
                    if (args.qualification && data.QualificationTypeId) {
                        assignQualification(data, cb);
                    }
                    else if (cb) cb();
                });
            }
            else if (args.qualification && data.QualificationTypeId) {
                assignQualification(data, cb);
            }
            else {
                if (cb) cb();
            }
        }
    }, function(err) {
        errorsApproveReject.push(err);
        if (cb) cb();
    });

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

    else if (command === 'assignQualification') {

        // QualificationTypeId.
        if (args.QualificationTypeId) {
            if ('string' !== typeof args.QualificationTypeId ||
                args.QualificationTypeId.trim() === '') {

                logger.error('--QualificationTypeId must be a non-empty ' +
                             'string. Found: ' + args.QualificationTypeId);
                if (cb) cb();
                return;
            }
        }
        else {
            if (!cfg.QualificationTypeId) {
                logger.warn('no --QualificationTypeId and no value in ' +
                            'config. Will try to use value from results code.');
            }
            else {
                args.QualificationTypeId = cfg.QualificationTypeId;
            }
        }

        // IntegerValue.
        if (args.IntegerValue) {
            res = J.isInt(args.IntegerValue, -1);
            if (res === false) {
                logger.error('--IntegerValue must be a non-negative integer. ' +
                             'Found: ' + args.IntegerValue);
                if (cb) cb();
                return;
            }
            args.IntegerValue = res;
        }
        else {
            if ('undefined' === typeof cfg.IntegerValue) {
                logger.warn('no --IntegerValue and no value in config. Will ' +
                            'try to use value from results code.');
            }
            else {
                args.IntegerValue = cfg.IntegerValue;
            }
        }

        // SendNotification.
        if (!args.SendNotification && cfg.SendNotification) {
            args.SendNotification = cfg.SendNotification;
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
        nQualificationGiven = 0;
        errorsQualification = [];
    }

}

/**
 * ### grantAllBonuses
 *
 *
 *
 */
function grantAllBonuses(args, cb) {
    // Check API and DB.
    if (!checkAPIandDB(cb)) return;
    // Check args.
    if (!prepareArgs('grantBonus', args, cb)) return;

    nBonusGiven = 0;
    totBonusPaid = 0;
    bonusProcessed = 0;
    errorsBonus = [];

    resultsDb.each(grantBonus, function(err) {
        if (++bonusProcessed >= totResults) {
            showUploadStats({ bonus: true }, cb);
        }
    }, args);

    return true;
}

/**
 * ### grantBonus
 *
 *
 *
 */
function grantBonus(data, cb, args) {
    var params, reason, uniqueToken, err;
    args = args || {};

    reason = args.Reason || data.Reason;
    if ('string' !== typeof reason) {
        err = 'invalid or missing Reason for WorkerId: ' + data.WorkerId +
            '. Found: ' + reason;
        logger.error(err);
        if (cb) cb(err);
        return;
    }

    params = {
        WorkerId: data.WorkerId,
        AssignmentId: data.AssignmentId,
        BonusAmount: {
            Amount: data[cfg.bonusField],
            CurrencyCode: 'USD'
        },
        Reason: reason
    };

    uniqueToken = args.UniqueRequestToken || data.UniqueRequestToken;

    if (uniqueToken) params.UniqueRequestToken = uniqueToken;

    shapi.req('GrantBonus', params, function(res) {
        nBonusGiven++;
        totBonusPaid += data[cfg.bonusField];
        if (cb) cb();
    }, function (err) {
        errorsBonus.push(err);
        if (cb) cb(err);
    });
}

/**
 * ### showUploadStats
 *
 *
 *
 */
function showUploadStats(args, cb) {
    var err;

    var totApproveExpected, totRejectExpected;
    var totBonusExpected;
    var totQualificationExpected;

    var nBonus, maxBonus, minBonus, meanBonus, stdDevBonus, sumSquaredBonus;

    // Check DB.
    if (!checkAPIandDB(cb, { api: false })) return;

    args = args || { all: true };

    logger.info('tot results: ' + totResults || 0);

    // Approve / Reject.
    if (args.all || args.result) {
        totApproveExpected = resultsDb.status.approve ?
            resultsDb.status.approve.size() : 0;
        totRejectExpected = resultsDb.status.reject ?
            resultsDb.status.reject.size() : 0;

        logger.info('to approve: ' + totApproveExpected);
        logger.info('to reject: ' + totRejectExpected);


        if ('number' !== typeof nProcessed) {
            logger.warn('results not yet uploaded to amt.');
            if (cb) cb();
            return true;
        }

        logger.info('results processed: ' + nProcessed + '/' + totResults);
        logger.info('approved: ' + nApproved);
        logger.info('rejected: ' + nRejected);

        if (errorsApproveReject && errorsApproveReject.length) {
            err = true;
            logger.error('approve/reject failed: ' +
                          errorsApproveReject.length);
        }
    }

    if (args.all || args.bonus) {
        totBonusExpected = 0;
        totApproveExpected = 0;
        totRejectExpected = 0;
        totQualificationExpected = 0;

        nBonus = 0, sumSquaredBonus = 0, stdDevBonus = 'NA';
        resultsDb.each(function(item) {
            var b;
            b = item[cfg.bonusField];
            if (b) {
                nBonus++;
                totBonusExpected += b;
                if ('undefined' === typeof maxBonus || b > maxBonus) {
                    maxBonus = b;
                }
                if ('undefined' === typeof minBonus || b < minBonus) {
                    minBonus = b;
                }
                sumSquaredBonus += Math.pow(b, 2);
            }
            if (item.Reject) totRejectExpected++;
            else if (item.Approve) totApproveExpected++;
            if (item.QualificationTypeId) totQualificationExpected++;
        });

        if (nBonus > 1 ) {
            stdDevBonus = (Math.pow(totBonusExpected, 2) / nBonus);
            stdDevBonus = sumSquaredBonus - stdDevBonus;
            stdDevBonus = Math.sqrt( stdDevBonus / (nBonus - 1) );
            meanBonus = (totBonusExpected / nBonus).toFixed(2);
        }
        else if (nBonus === 1) {
            meanBonus = maxBonus;
        }

        logger.info('results: ' + totResults || 0);
        logger.info('to approve: ' + totApproveExpected);
        logger.info('to reject: ' + totRejectExpected);
        logger.info('bonuses: ' + nBonus);
        if (nBonus > 0) {
            logger.info('bonuses tot: ' + totBonusExpected);
            if (nBonus > 1) {
                logger.info('bonuses mean: ' + meanBonus);
                logger.info('bonuses min: ' + minBonus);
                logger.info('bonuses max: ' + maxBonus);
                logger.info('bonuses stddev: ' + stdDevBonus);
            }
        }


        if ('number' !== typeof nProcessed) {
            logger.warn('results not yet uploaded to amt.');
            if (cb) cb();
            return true;
        }

        logger.info('results processed: ' + nProcessed + '/' + totResults);
        logger.info('approved: ' + nApproved);
        logger.info('rejected: ' + nRejected);
        logger.info('bonuses: ' + nBonusGiven +
                    ' (paid: ' + (totBonusPaid || 0) + ')');

        if (errorsApproveReject && errorsApproveReject.length) {
            err = true;
            logger.error('approve/reject failed: ' +
                         errorsApproveReject.length);
        }
        if (errorsBonus && errorsBonus.length) {
            err = true;
            logger.error('bonuses failed: ' + errorsBonus.length);
        }
    }

    if (args.all || args.qualification) {
        logger.info('qualifications: ' + totQualificationExpected);

        if ('number' !== typeof nProcessed) {
            logger.warn('results not yet uploaded to amt.');
            if (cb) cb();
            return true;
        }
        logger.info('qualifications given: ' + nQualificationGiven);
        if (errorsQualification && errorsQualification.length) {
            err = true;
            logger.error('qualifications failed: ' +
                          errorsQualification.length);
        }
    }

    if (err) {
    // logger.warn('type showErrors to have more details about the errors');
    }

    if (args.GetAccountBalance) {
        getAccountBalance({}, function(balance) {
            if ('undefined' !== typeof args.origAccountBalance) {
                logger.log('Original balance: ' +
                           args.origAccountBalance.FormattedPrice +
                           ' New balance: ' + balance.FormattedPrice +
                           ' (diff: ' +
                           args.origAccountBalance.Amount - balance.Amount +
                           ')');
                if (cb) cb();
            }
            else {
                showAvailableAccountBalance({}, cb);
            }
        });
    }
    else if (cb) cb();

    return true;
}

/**
 * ### extendHIT
 *
 *
 *
 */
function extendHIT(args, cb) {
    var data, assInc, expInc;

    if (!api || !shapi) {
        logger.error('api not available. connect first');
        if (cb) cb();
        return;
    }
    if (!HITId) {
        logger.error('no HIT id found. get-last-HITId first');
        if (cb) cb();
        return;
    }

    assInc = args.options ? args.options.assignments : args.assignments;
    expInc = args.options ? args.options.time : args.time;

    if (!expInc && !assInc) {

        logger.error('ExtendHIT: both MaxAssignmentsIncrement and ' +
                     'ExpirationIncrementInSeconds are missing.');
        if (cb) cb();
        return;
    }

    if (assInc && ('number' !== typeof assInc || assInc < 1)) {
        logger.error('ExtendHIT: MaxAssignmentsIncrement must be ' +
                     'a number > 1 or undefined. Found: ' + assInc);
        if (cb) cb();
        return;
    }

    if (expInc && ('number' !== typeof expInc || assInc < 1)) {
        logger.error('ExtendHIT: MaxAssignmentsIncrement must be ' +
                     'a number > 1 or undefined. Found: ' + assInc);
        if (cb) cb();
        return;
    }

    data = {
        HITId: HITId,
        MaxAssignmentsIncrement: assInc,
        ExpirationIncrementInSeconds: expInc
    };

    shapi.req('ExtendHIT', data, function() {
        logger.info('HIT extended: ' + HITId);
        if (cb) cb();
    }, function(err) {
        logger.error('HIT could **not** be extended: ' + HITId);
        if (cb) cb();
    });

    return true;
}


/**
 * ### expireHIT
 *
 *
 *
 */
function expireHIT(args, cb) {
    if (!api || !shapi) {
        logger.error('api not available. connect first');
        if (cb) cb();
        return;

    }
    if (!HITId) {
        logger.error('not HIT id found. get-last-HITId first');
        if (cb) cb();
        return;
    }

    shapi.req('ForceExpireHIT', {
        HITId: HITId
    }, function() {
        logger.info('HIT expired: ' + HITId);
        if (cb) cb();
    }, function(err) {
        logger.error('HIT could **not** be expired: ' + HITId);
        if (cb) cb();
    });
    return true;
}



/**
 * ### getQualificationType
 *
 *
 *
 */
function getQualificationType(args, cb) {
    if (!api || !shapi) {
        logger.error('api not available. connect first');
        if (cb) cb();
        return;
    }
    shapi.getQualificationType(function(err, qualificationType) {
        if (err) {
            logger.error('an error occurred retrieving qualification type id');
            logger.error(err);
            if (cb) cb();
            return;
        }
        QualificationType = qualificationType[0];
        QualificationTypeId = QualificationType.QualificationTypeId;

        cfg.QualificationTypeId = QualificationTypeId;

        logger.info('retrieved QualificationTypeId: ' + QualificationTypeId +
                   ' ("' + QualificationType.Name + '")');
        if (cb) cb();
    });
}


/**
 * ### getLastHITId
 *
 *
 *
 */
function getLastHITId(args, cb) {
    if (!api || !shapi) {
        logger.error('api not available. connect first');
        if (cb) cb();
        return;
    }
    shapi.getLastHIT(function(err, HIT) {
        if (err) {
            logger.error('an error occurred retrieving last HIT id');
            logger.error(err);
            if (cb) cb();
            return;
        }
        HIT = HIT.HIT[0];
        HITId = HIT.HITId;
        logger.info('retrieved last HIT id: ' + HITId + ' ("' +
                    HIT.Title + '")');
        if (cb) cb();
    });
}
