"use strict";

// ## Result.

var J = require('JSUS').JSUS;
var fs = require('fs-extra');

var logger = require('../core/logger')();
var cfg = require('../core/config')();
var api = require('../core/api');

var codes = require('./codes');
var show = require('./show');
var bonus = require('./bonus');
var qualification = require('./qualification');
var balance = require('./balance');

var nApproved, nRejected, nProcessed;
var errorsApproveReject;

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
    balance.get({}, function(balanceObj) {

        options.origAccountBalance = balanceObj;
        options.GetAccountBalance = true;

        // Do it!
        resultsDb.each(uploadResult, function(err) {
            if (++nProcessed >= totResults) {
                show.uploadStats(options, cb);
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

    api.req(op + 'Assignment', params, function() {
        // No bonus granting if assignment is rejected.
        if (op === 'Reject') {
            nRejected++;
        }
        else {
            nApproved++;

            if (args.bonus && data[cfg.bonusField]) {
                bonus.grant(data, function() {
                    if (args.qualification && data.QualificationTypeId) {
                        qualification.assign(data, cb);
                    }
                    else if (cb) cb();
                });
            }
            else if (args.qualification && data.QualificationTypeId) {
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
 * ## Exports
 *
 *
 *
 */
module.exports = {
    upload: uploadResults,
    prepareArgs: prepareArgs,
    resetGlobals: resetGlobals
};
