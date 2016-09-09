#!/usr/bin/env node

"use strict";

// General.
var fs = require('fs-extra');
var path = require('path');
var mturk = require('mturk-api');
var _ = require('underscore');
var program = require('commander');
var winston = require('winston');
var NDDB = require('NDDB').NDDB;
var J = require('JSUS').JSUS;

// Local.
var version = require('./package.json').version;

// GLOBAL VARIABLES
////////////

// Config as loaded by file, and augmented by inline options.
var cfg;

// The api command after a connection has been established.
var api, shapi, options;

// Winston logger.
var logger;

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
var bonusesToGrant, bonusesGranted, bonusesProcessed;

// Commander.

program
    .version(version)

     // Specify a configuration file (other inline-options are mixed-in.)
    .option('-C, --config [confFile]',
            'Specifies a configuration file')

    .option('-c, --connect',
            'Opens the connection with Mturk Server')

    .option('-L, --lastHITId [lastHITId]',
            'Fetches the last HIT id by requester')

    .option('-r, --resultsFile [resultsFile]',
            'Path to a codes file with Exit and Access Codes')

    .option('-i, --inputCodesFile [inputCodesFile]',
            'Path to a codes file with Exit and Access Codes')

//    .option('-T, --hitTitle [hitTitle]',
//            'Uses the HITId of the first HIT with same title by requester')

    .option('-Q, --getQualificationTypeId',
            'Fetches the first qualification type owned by requester from AMT')

    .option('-H, --HITId [HITId]',
            'HIT id')

    .option('-t, --token [token]',
            'Unique token for one-time operations')

    .option('-s, --sandbox',
            'Activate sandbox mode')

    .option('-d, --dry',
            'Dry-run: does not actually send any request to server')

    .option('-q, --quiet',
            'No/minimal output printed to console');


// Parsing input parameters.
program.parse(process.argv);

// Create logger.
logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            level: program.quiet ? 'error' : 'silly'
        }),
        new (winston.transports.File)({
            filename: 'log/nodegame-mturk.log',
            level: 'silly'
        })
    ]
});
module.exports.logger = logger;

// Load and check config.
/////////////////////////

var shared = require('./lib/shared');
cfg = shared.loadConfig(program.config);
cfg = shared.checkConfig(program, cfg);
if (!cfg) return;

// VORPAL COMMANDS
//////////////////
var vorpal = require('vorpal')();

vorpal
    .command('connect')
    .action(connect);



vorpal
    .command('get <what>', 'Fetches and stores the requested info')
    .autocomplete(['last-HITId', 'last-Qualification-Type'])
    .action(function(args, cb) {
        if (args.what === 'last-HITId') {
            getLastHITId({}, cb);
        }
        else if (args.what === 'last-Qualification-Type') {
            getQualificationType({}, cb);
        }
        else {
            winston.warn('unknown "get" argument: ' + args.what);
            cb();
        }
    });

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

    .option('-t, --token [token]',
            'Unique token for one-time operations')

    .option('-q, --qualificationId [qualificationTypeId]',
            'Assigns also a qualification')

    .option('-b, --bonus', 'Also grant bonus, if found')

    .option('-r --reason [reason]',
            'Sets the reason for the bonus')

    .option('-q, --qualification [integerValue]',
            'Also assigns qualification, if found')

    .action(uploadResults);

vorpal
    .command('grantBonus',
             'Grants bonuses as specified in results codes')

    .option('-t, --token [token]',
            'Unique token for one-time operations')

    .option('-r --reason [reason]',
            'Sets the reason for the bonus')

    .action(grantAllBonuses);

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
    .command('show <what>', 'Prints out the requested info')
    .autocomplete(['results', 'uploadStats', 'inputCodes', 'config' ])
    .option('-p, --position [position]', 'Position of result|input code  in db')

    .action(function(args, cb) {
        var idx, config;

        if (args.what === 'results') {
            if (!resultsDb || !resultsDb.size()) {
                winston.error('no results to show.');
            }
            else {
                idx = args.options.position || 0;
                this.log(resultsDb.get(idx));
            }
        }
        else if (args.what === 'inputCodes') {
            if (!inputCodesDb || !inputCodesDb.size()) {
                winston.error('no input codes to show.');
            }
            else {
                idx = args.options.position || 0;
                this.log(inputCodesDb.get(idx));
            }
        }

        else if (args.what === 'uploadStats') {
            showUploadStats();
        }

        else if (args.what === 'config') {
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
            winston.warn('unknown "show" argument: ' + args.what);
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

function checkAPIandDB(cb) {
    if (!api || !shapi) {
        logger.error('api not available. connect first');
        if (cb) cb();
        return;
    }

    // Results db must exists and not be empty.
    if (!resultsDb || !resultsDb.size()) {
        logger.error('no results found');
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

    // QualificationTypeId.
    if (args.QualificationTypeId) {
        if ('string' !== typeof args.QualificationTypeId ||
            args.QualificationTypeId.trim() === '') {

            winston.error('--QualificationTypeId must be a non-empty string. ' +
                          'Found: ' + args.QualificationTypeId);
            if (cb) cb();
            return;
        }
    }
    else {
        if (!cfg.QualificationTypeId) {
            winston.warn('no --QualificationTypeId and no value in ' +
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
            winston.error('--IntegerValue must be a non-negative integer. ' +
                          'Found: ' + args.IntegerValue);
            if (cb) cb();
            return;
        }
        args.IntegerValue = res;
    }
    else {
        if ('undefined' === typeof cfg.IntegerValue) {
            winston.warn('no --IntegerValue and no value in config. Will try ' +
                         'to use value from results code or default.');
        }
        else {
            args.IntegerValue = cfg.IntegerValue;
        }
    }

    // SendNotification.
    if (!args.SendNotification) {
        if (cfg.SendNotification) args.SendNotification = cfg.SendNotification;
    }

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

    nQualificationGiven = 0;
    nProcessed = 0;
    errorsQualification = [];

    // Do it!
    resultsDb.each(assignQualification, function(err) {
        if (++nProcessed >= totResults) {
            showUploadStats({ qualification: true }, cb);
        }
    }, args);

    return true;
}

function assignQualification(data, cb, args) {
    var qid, params, err;

    // Qualification.
    qid = args.QualificationTypeId || data.QualificationTypeId;

    if (!qid) {
        err = 'no QualificationTypeId found. WorkerId: ' + data.WorkerId
        winston.error(err);
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
    var uniqueToken;
    var options;

    // Check API and DB.
    if (!checkAPIandDB(cb)) return;

    // Check reason.
    if (args.reason &&
        ('string' !== typeof args.reason || args.reason.trim() === '')) {

        logger.error('--reason must be a non-empty string. Found: ' +
                     args.reason);
        if (cb) cb();
        return;
    }

    // Bonus should be set if reason is.
    if (args.reason && !args.bonus) {
        logger.error('--reason is set, but --bonus is not. Aborting command.');
        if (cb) cb();
        return;
    }

    nApproved = 0;
    nRejected = 0;
    nBonusGiven = 0;
    totBonusPaid = 0;
    nQualificationGiven = 0;
    nProcessed = 0;

    errorsApproveReject = [];
    errorsBonus = [];
    errorsQualification = [];

    uniqueToken = args.token || cfg.token;
    if ('number' !== typeof uniqueToken || uniqueToken === 0) {
        logger.error('unique token is invalid. Found: ' + uniqueToken);
        if (cb) cb();
        return;
    }

    logger.info('unique token: ' + uniqueToken);

    // Do it!
    resultsDb.each(uploadResult, function(err) {
        if (++nProcessed >= totResults) {
            showUploadStats(undefined, cb);
        }
    }, args);

    return true;
}

/**
 * ### uploadResult
 *
 *
 *
 */
function uploadResult(data, cb, options) {
    var id, wid, op, params;

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

    params = {
        AssignmentId: data.AssignmentId
    };

    if (params.RequesterFeedback) {
        params.RequesterFeedback = data.RequesterFeedback;
    }

    // No bonus granting if assignment is rejected.

    shapi.req(op + 'Assignment', params, function() {
        if (op === 'Reject') {
            nRejected++;
        }
        else {
            nApproved++;

            if (options.bonus && data[cfg.bonusField]) {
                grantBonus(data, function() {
                    if (options.qualification && data.QualificationTypeId) {
                        assignQualification(data, cb);
                    }
                    else if (cb) cb();
                });
            }
            else if (options.qualification && data.QualificationTypeId) {
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

function grantAllBonuses(opts, cb) {
    var uniqueToken;

    // Check API and DB.
    if (!checkAPIandDB(cb)) return;

    if (opts.reason &&
        ('string' !== typeof opts.reason || opts.reason.trim() === '')) {
        winston.error('grantBonus: --reason must be string or undefined. ' +
                      'Found: ' + opts.reason);
        if (cb) cb();
        return
    }

    uniqueToken = opts.token || cfg.token;
    if ('number' !== typeof uniqueToken || uniqueToken === 0) {
        logger.error('unique token is invalid. Found: ' + uniqueToken);
        if (cb) cb();
        return;
    }

    bonusProcessed = 0;
    bonusesGranted = 0;

    resultsDb.each(function(i, cb) {
        var myi;
        myi = J.clone(i);
        if (opts.reason) myi.Reason = opts.reason;
        myi.token = uniqueToken;
        grantBonus(myi);
    }, function(err) {
        if (++bonusProcessed >= totResults) {
            showUploadStats(undefined, cb);
        }
    });

    if (cb) cb();
};

function grantBonus(data, cb) {
    var params;

    params = {
        WorkerId: data.WorkerId,
        AssignmentId: data.AssignmentId,
        BonusAmount: {
            Amount: data[cfg.bonusField],
            CurrencyCode: 'USD'
        },
        UniqueRequestToken: cfg.token
    };
    if (data.Reason) params.Reason = data.Reason;

    shapi.req('GrantBonus', params, function(res) {
        nBonusGiven++;
        totBonusPaid += data[cfg.bonusField];
        if (cb) cb();
    }, function (err) {
        errorsBonus.push(err);
        if (cb) cb(err);
    });
}

function showUploadStats(args, cb) {
    var err;

    var totApproveExpected, totRejectExpected;
    var totBonusExpected;
    var totQualificationExpected;

    var nBonus, maxBonus, minBonus, meanBonus, stdDevBonus, sumSquaredBonus;

    if (!resultsDb || !resultsDb.size()) {
        winston.warn('no results found.');
        if (cb) cb();
        return true;
    }

    args = args || { all: true };

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

        winston.info('results: ' + totResults || 0);
        winston.info('to approve: ' + totApproveExpected);
        winston.info('to reject: ' + totRejectExpected);
        winston.info('bonuses: ' + nBonus);
        if (nBonus > 0) {
            winston.info('bonuses tot: ' + totBonusExpected);
            if (nBonus > 1) {
                winston.info('bonuses mean: ' + meanBonus);
                winston.info('bonuses min: ' + minBonus);
                winston.info('bonuses max: ' + maxBonus);
                winston.info('bonuses stddev: ' + stdDevBonus);
            }
        }


        if ('number' !== typeof nProcessed) {
            winston.warn('results not yet uploaded to amt.');
            if (cb) cb();
            return true;
        }

        winston.info('results processed: ' + nProcessed + '/' + totResults);
        winston.info('approved: ' + nApproved);
        winston.info('rejected: ' + nRejected);
        winston.info('bonuses: ' + nBonusGiven +
                     ' (paid: ' + (totBonusPaid || 0) + ')');

        if (errorsApproveReject && errorsApproveReject.length) {
            err = true;
            winston.error('approve/reject failed: ' +
                          errorsApproveReject.length);
        }
        if (errorsBonus && errorsBonus.length) {
            err = true;
            winston.error('bonuses failed: ' + errorsBonus.length);
        }
    }

    if (args.all || args.qualification) {
        winston.info('qualifications: ' + totQualificationExpected);

        if ('number' !== typeof nProcessed) {
            winston.warn('results not yet uploaded to amt.');
            if (cb) cb();
            return true;
        }
        winston.info('qualifications given: ' + nQualificationGiven);
        if (errorsQualification && errorsQualification.length) {
            err = true;
            winston.error('qualifications failed: ' +
                          errorsQualification.length);
        }
    }

    if (err) {
    // winston.warn('type showErrors to have more details about the errors');
    }
    if (cb) cb();
    return true;
}

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


function connect(args, cb) {
    if (api) {
        logger.error('already connected.');
        if (cb) cb();
        return;
    }

    logger.info('creating mturk client...');

    // Here we start!
    mturk.createClient(cfg).then(function(mturkapi) {
        logger.info('done.');

        ///////////////////////////////////////
        // Share the api with other commands.
        api = mturkapi;
        module.exports.api = api;
        module.exports.cfg = cfg;
        // Careful: if there is an error here, vorpal exits without notice.
        shapi = require('./lib/shared-api.js');
        ///////////////////////////////////////

        if (args.getQualificationTypeId && args.getLastHITId) {
            getQualificationType({}, function() {
                getLastHITId({}, cb);
            });
        }
        else if (args.getLastHITId) {
            getLastHITId({}, cb);
        }
        else if (args.getQualificationTypeId) {
            getQualificationType({}, cb);
        }
        else if (cb) {
            cb();
        }

    }).catch(function(err) {
        logger.err('failed.');
        winston.error(err);
        if (cb) cb();
    });

    return true;
}

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

function getInputCodesDB() {
    var db;

    inputCodesErrors = [];
    db = new NDDB();

    db.on('insert', function(code) {
        if (!!code.WorkerId) {
            // Add to array, might dump to file in the future.
            inputCodesErrors.push('missing WorkerId');
            logger.error('invalid input code entry: ' + code);
        }
    });
    db.index('id', function(i) { return i.WorkerId; });
    return db;
}

function getResultsDB() {
    var db;

    resultsErrors = [];
    db = new NDDB();

    db.index('id', function(i) {
        return i.id;
    });
    db.index('wid', function(i) {
        return i.WorkerId;
    });
    db.index('aid', function(i) {
        return i.AssignmentId;
    });
    db.index('exit', function(i) {
        return i[cfg.exitCodeField];
    });

    db.on('insert', function(i) {
        var str, code;

        // Check no duplicates.
        if (this.id.get(i.id)) {
            str = 'duplicate code id ' + i.id;
            logger.error(str);
            resultsErrors.push(str);
        }
        if (this.wid.get(i.WorkerId)) {
            str = 'duplicate WorkerId ' + i.WorkerId;
            logger.error(str);
            resultsErrors.push(str);
        }
        if (this.exit.get(i[cfg.exitCodeField])) {
            str = 'duplicate ExitCode ' + i[cfg.exitCodeField];
            logger.error(str);
            resultsErrors.push(str);
        }
        if (this.aid.get(i.AssignmentId)) {
            str = 'duplicate AssignmentId ' + i.AssignmentId;
            logger.error(str);
            resultsErrors.push(str);
        }

        if (validateLevel) {
            // Standard validation.
            str = shared.validateCode(i, validateParams);
            if (str) {
                resultsErrors.push(str);
                logger.error(str);
            }
            // Custom validation.
            else if ('function' === typeof validateResult) {
                str = shared.validateResult(i, validateParams);
                if ('string' === typeof str) {
                    resultsErrors.push(str);
                    logger.error(str);
                }
            }
        }

        // Adding Qualification Type ID, if found.
        if (QualificationTypeId) i.QualificationTypeId = QualificationTypeId;

        // We must validate WorkerId and Exit Code (if found in inputCodes db).
        if (inputCodesDb) {
            if (i.id) {
                code = inputCodesDb.id.get(i.id);
                if (!code) {
                    str = 'id not found in inputCodes db: ' + i.id;
                    logger.warn(str);
                    resultsErrors.push(str);
                }
            }

            if (i[cfg.exitCodeField]) {
                if (!code) code = inputCodesDb.exit.get(i[cfg.exitCodeField]);
                if (!code) {
                    str = 'ExitCode not found: ' + i[cfg.exitCodeField];
                }
                else if (i[cfg.exitCodeField] !== code.ExitCode) {
                    str = 'ExitCodes do not match. WorkerId: ' + i.WorkerId +
                        '. ExitCode: ' + i[cfg.exitCodeField] +
                        ' (found) vs ' + code.ExitCode + ' (expected)';
                }
                if (str) {
                    logger.error(str);
                    resultsErrors.push(str);
                }
            }
        }

    });

    return db;
}
