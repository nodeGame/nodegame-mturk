"use strict";

// ## Result.

const J = require('JSUS').JSUS;
const fs = require('fs-extra');

const logger = require('../core/logger')();
const cfg = require('../core/config')();
const api = require('../core/api');
const codes = require('../core/codes');

const show = require('./show');
const bonus = require('./bonus');
const qualification = require('./qualification');
const balance = require('./balance');

var nApproved, nRejected, nProcessed;
var errorsApproveReject;

// Make sure that even in programmatic modes, everything is initialized.
resetGlobals();

/**
 * ### uploadResults
 *
 *
 *
 */
function uploadResults(args, cb) {
    var res, options, resultsDb, totResults;

    resultsDb = codes.getResultsDb(true, cb);
    if (!resultsDb) return;
    res = api.get(true, cb);
    if (!res) return;

    // Args.
    if (!prepareArgs(args, cb)) return;

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
        res = bonus.prepareArgs(args, cb);
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
        res = qualification.prepareArgs(args, cb);
        if (!res) return;
    }

    // All checkings done. Prepare global variables.

    resetGlobals('uploadResult');
    options = { 'uploadResult': true };

    if (args.doBonus) {
        bonus.resetGlobals();
        options.grantBonus = true;
    }
    if (args.doQualification) {
        qualification.resetGlobals();
        options.assignQualification = true;
    }

    totResults = resultsDb.size();

    // Show balance difference after all operations are completed.
    balance.showDiff({}, function(err, done) {
        api.reqArray(resultsDb, args, function(result, args) {
            uploadResult(result, function(err) {
                if (++nProcessed >= totResults) {
                    showStats(args, function() {
                        if (done) done(cb);
                        else if (cb) cb();
                    });
                }
            }, args);
        });
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

    id = data[cfg.fields.id];
    wid = data[cfg.fields.workerId];

    if (data[cfg.fields.reject]) {
        if (data[cfg.fields.bonus]) {
            logger.warn('Assignment rejected, but bonus found, it ' +
                        'will not be granted. WorkerId: ' + wid);
        }
        op = 'Reject';
    }
    else {
        op = 'Approve';
    }

    params = { AssignmentId: data[cfg.fields.assignmentId] };
    
    feedback = args.RequesterFeedback || data[cfg.fields.requesterFeedback];
    if (feedback) params.RequesterFeedback = feedback;

    api.req(op + 'Assignment', params, function() {
        // No bonus granting if assignment is rejected.
        if (op === 'Reject') {
            nRejected++;
        }
        else {
            nApproved++;

            if (args.bonus && data[cfg.fields.bonus]) {
                bonus.grant(data, function() {
                    if (args.qualification &&
                        data[cfg.fields.qualificationTypeId]) {

                        qualification.assign(data, cb);
                    }
                    else if (cb) cb();
                });
            }
            else if (args.qualification &&
                     data[cfg.fields.qualificationTypeId]) {

                qualification.assign(data, cb);
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
function prepareArgs(args, cb) {
    if (args.RequesterFeedback &&
        ('string' !== typeof args.RequesterFeedback ||
         args.RequesterFeedback.trim() === '')) {

        logger.error('--RequesterFeedback must be a non-empty ' +
                     'string. Found: ' + args.RequesterFeedback);
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
function resetGlobals() {
    nApproved = 0;
    nRejected = 0;
    nProcessed = 0;
    errorsApproveReject = [];
}


/**
 * ### showStats
 *
 *
 *
 */
function showStats(args, cb) {
    var resultsDb, totResults;
    var stat;

    resultsDb = codes.getResultsDb(true, cb);
    if (!resultsDb) return;
    totResults = resultsDb.size();

    logger.info('tot results: ' + totResults);

    stat = codes.getStats('result');

    logger.info('to approve:  ' + stat.approveCount);
    logger.info('to reject:   ' + stat.rejectCount);
    console.log();

    if (!nProcessed) {
        // logger.warn('results not yet uploaded to amt.');
        if (cb) cb();
        return true;
    }

    logger.info('results processed: ' + nProcessed + '/' + totResults);
    logger.info('approved: ' + nApproved);
    logger.info('rejected: ' + nRejected);

    if (errorsApproveReject && errorsApproveReject.length) {
        logger.error('approve/reject failed: ' +
                     errorsApproveReject.length);
    }
    console.log();

    if (cb) cb();
    return true;
}

/**
 * ## Exports
 *
 *
 *
 */
module.exports = {
    upload: uploadResults,
    prepareArgs: prepareArgs,
    resetGlobals: resetGlobals,
    showStats: showStats
};
