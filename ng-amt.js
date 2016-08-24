#!/usr/bin/env node

"use strict";

// General.
var fs = require('fs');
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
var config;

// The api command after a connection has been established.
var api, shapi, options;

// Winston logger.
var logger;

// Reference to the HITId and HIT object.
var HITId, HIT;

// Unique token for sensitive operations.
var uniqueToken;

// Bonus/Results approval operations.
var bonusField, exitCodeField;
var validateLevel, validateParams;
var sendNotification, qualificationId;

var inputCodesFile, resultsFile;
var inputCodesErrors, resultsErrors;
var inputCodesDb, resultsDb;

var nApproved, nRejected, nBonusGiven, nQualificationGiven, nProcessed;
var errorsApproveReject, errorsBonus, errorsQualification;

// QualificationType Id;
var QualificationTypeId, QualificationType;

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
            'Dry-run: does not send requests to servers')

    .option('-q, --quiet',
            'No/minimal output printed to console')


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
config = shared.loadConfig(program.config);
config = shared.checkConfig(program, config);
if (!config) return;

// VORPAL COMMANDS
//////////////////
var vorpal = require('vorpal')();

vorpal
    .command('connect')
    .action(connect);

vorpal
    .command('get-last-HITId', 'Fetches and stores the last HIT id')
    .action(getLastHITId);

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
    .command('showResult', 'Shows the result object in db')

    .option('-p, --position [position]', 'Position of result in db')

    .action(function(args, cb) {
        var idx;
        if (!resultsDb || !resultsDb.size()) {
            winston.error('no results to show.');
            cb();
            return;
        }
        idx = args.options.position || 0;
        this.log(resultsDb.get(idx));
        cb();
    });

vorpal
    .command('showSummary', 'Shows summary of "approveOrRejectAll" operation')

    .action(showSummaryApproveOrReject);


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
    .command('showInputCode', 'Shows the first input code object in db ')

    .option('-p, --position [position]', 'Position of input code in db')

    .action(function(args, cb) {
        var idx;
        if (!inputCodesDb || !inputCodesDb.size()) {
            winston.error('no input codes to show.');
            cb();
            return;
        }
        idx = args.options.position || 0;
        this.log(inputCodesDb.get(idx));
        cb();
    });

vorpal
    .command('approveOrRejectAll',
             'Uploads the results to AMT server (approval+bonus+qualification)')

    .option('-t, --token [token]',
            'Unique token for one-time operations')

    .option('-q, --qualificationId [qualificationTypeId]',
            'Assigns also a qualification')

    .action(approveOrRejectAll);


vorpal
    .command('getConfig', 'Shows the current configuration')

    .action(function(args, cb) {
        var cfg = J.clone(config);
        config.resultsFile = resultsFile;
        config.inputCodesFile = inputCodesFile;
        config.nResults = resultsDb ? resultsDb.size() : 'NA';
        config.nInputCodes = inputCodesDb ? inputCodesDb.size() : 'NA';
        config.HITId = HITId || 'NA';
        config.QualificationTypeId = QualificationTypeId || 'NA';
        config.token = uniqueToken || 'NA';
        config.api = api ? 'client created' : 'client **not** created';
        this.log(config);
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

// END DEFAUL  ACTION
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
    resultsFile = args.resultsFile || config.resultsFile;
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
    validateLevel = args.validateLevel || config.validateLevel;
    logger.info('validation level: ' + validateLevel);
    validateParams = {
        bonusField: bonusField,
        exitCodeField: exitCodeField
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

    logger.info('result codes: ' + resultsDb.size());
    if (cb) cb();
    return true;
}

function loadInputCodes(args, cb) {

    // Input Codes.
    inputCodesFile = args.inputCodesFile || config.inputCodesFile;
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

function approveOrRejectAll(args, cb) {

    // Results db must exists and not be empty.
    if (!resultsDb || !resultsDb.size()) {
        logger.error('no results found');
        if (cb) cb();
        return;
    }

    totResults = resultsDb.size();
    nApproved = 0;
    nRejected = 0;
    nBonusGiven = 0;
    nQualificationGiven = 0;
    nProcessed = 0;

    errorsApproveReject = [];
    errorsBonus = [];
    errorsQualification = [];

    uniqueToken = args.token || config.token;
    if ('number' !== typeof uniqueToken || uniqueToken === 0) {
        logger.error('unique token is invalid. Found: ' + uniqueToken);
        if (cb) cb();
        return;
    }

    logger.info('unique token: ' + uniqueToken);

    // Do it!
    resultsDb.each(approveOrReject, function(err, cb) {
        if (++nProcessed >= totResults) {
            showSummaryapproveOrReject(undefined, cb);
        }
    });

    return true;
}

function approveOrReject(data, cb) {
    var id, wid, op, params;

    id = data.id;
    wid = data.WorkerId;

    if (data.Reject) {
        if (data[bonusField]) {
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
            if (data[bonusField]) {
                grantBonus(data, function() {
                    if (data.QualificationTypeId) {
                        grantQualification(data, cb);
                    }
                    else if (cb) cb();
                });
            }
            else if (data.QualificationTypeId) {
                grantQualification(data, cb);
            }
        }
    }, function(err) {
        errorsApproveReject.push(err);
        if (cb) cb();
    });

    return true;
}

function grantBonus(data, cb) {
    var params;

    params = {
        WorkerId: data.WorkerId,
        AssignmentId: data.AssignmentId,
        BonusAmount: {
            Amount: data[bonusField],
            CurrencyCode: 'USD'
        },
        UniqueRequestToken: uniqueToken
    };
    if (data.Reason) params.Reason = data.Reason;
    shapi.req('GrantBonus', params, function(res) {
        nBonuseGiven++;
        totBonuses += data[bonusField];
        if (cb) cb();
    }, function (err) {
        errorsBonus.push(err);
        if (cb) cb(err);
    });
}

function grantQualification(data, cb) {
    var qid, params;

    // Qualification.
    qid = data.QualificationTypeId || qualificationTypeId;
    if (!qid) return;

    params = {
        WorkerId: data.WorkerId,
        QualificationTypeId: qid,
        SendNotification: !!data.SendNotification || sendNotification
    };

    if (data.IntegerValue) {
        paramsQualification.IntegerValue = data.IntegerValue;
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

function showSummaryApproveOrReject(args, cb) {
    var err;
    if ('number' !== typeof nProcessed) {
        winston.warn('no summary to show.');
        if (cb) cb();
        return true;
    }

    winston.info('results processed: ' + nProcessed + '/' + totResults);
    winston.info('approved: ' + nApproved);
    winston.info('rejected: ' + nRejected);
    winston.info('bonuses: ' + nBonusGiven +
                 '(paid: ' + totBonusPaid + ')');
    winston.info('qualifications: ' + nQualificationGiven);
    if (errorsApproveReject.length) {
        err = true;
        winston.error('errors approve/reject: ' + errorsApproveReject.length);
    }
    if (errorsBonus.length) {
        err = true;
        winston.error('errors bonuses: ' + errorsBonus.length);
    }
    if (errorsQualification.length) {
        err = true;
        winston.error('errors qualifications: ' + errorsQualification.length);
    }
    if (err) {
        winston.warn('type showErrors to have more details about the errors');
        winston.warn('command showErrors might not be available right now');
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
        HITId: HITId,
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
    mturk.createClient(config).then(function(mturkapi) {
        logger.info('done.');

        ///////////////////////////////////////
        // Share the api with other commands.
        api = mturkapi;
        module.exports.api = api;
        module.exports.config = config;
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
        logger.info('retrieved QualificationType id: ' + QualificationTypeId +
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
            dbErrors.push('missing WorkerId');
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
        return i[exitCodeField];
    });

    db.on('insert', function(i) {
        var str;

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
        if (this.exit.get(i[exitCodeField])) {
            str = 'duplicate ExitCode ' + i[exitCodeField];
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
            str = shared.validateCode(i, validateParams)
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

            if (i[exitCodeField]) {
                if (!code) code = inputCodesDb.exit.get(i[exitCodeField]);
                if (!code) {
                    str = 'ExitCode not found: ' + i[exitCodeField];
                }
                else if (i[exitCodeField] !== code.ExitCode) {
                    str = 'ExitCodes do not match. WorkerId: ' + i.WorkerId +
                        '. ExitCode: ' + i[exitCodeField] + ' (found) vs ' +
                        code.ExitCode + ' (expected)'
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
