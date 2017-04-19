"use strict";

// ## Qualification.

var J = require('JSUS').JSUS;

var logger = require('../core/logger')();
var cfg = require('../core/config')();
var api = require('../core/api');
var codes = require('../core/codes');

var show = require('./show');

var nProcessed, nQualificationGiven, errorsQualification;

/**
 * ### assignAllQualifications
 *
 *
 *
 */
function assignAllQualifications(args, cb) {
    var res, resultsDb;
    var totResults;

    resultsDb = codes.getResultsDb(true, cb);
    if (!resultsDb) return;
    res = api.get(true, cb);
    if (!res) return;

    res = prepareArgs(args, cb);
    if (!res) return;

// var that;
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

    resetGlobals();

    // Do it!
    totResults = resultsDb.size();

    api.reqArray(resultsDb, args, function(item) {
        assignQualification(item, function(err) {
            if (++nProcessed >= totResults) {
                showStats({}, cb);
            }
        }, args);
    });

    return true;

    resultsDb.each(assignQualification, function(err) {
        if (++nProcessed >= totResults) {
            showStats({}, cb);
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

    api.req('AssignQualification', params, function(res) {
        nQualificationGiven++;
        if (cb) cb();
    }, function (err) {
        errorsQualification.push(err);
        if (cb) cb(err);
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
    var res;

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

    return true;
}

/**
 * ### resetGlobals
 *
 *
 *
 */
function resetGlobals() {
    nProcessed = 0;
    nQualificationGiven = 0;
    errorsQualification = [];
}

/**
 * ### showStats
 *
 *
 *
 */
function showStats(args, cb) {
    var resultsDb, stat;

    resultsDb = codes.getResultsDb(true, cb);
    if (!resultsDb) return;

    stat = codes.getStats('qualification');

    logger.info('qualifications: ' + stat.count);
    console.log();
    if (!nProcessed) {
        // logger.warn('no qualification assigned yet.');
        if (cb) cb();
        return true;
    }

    logger.info('qualifications assigned: ' + nQualificationGiven);
    if (errorsQualification && errorsQualification.length) {
        logger.error('qualifications failed: ' +
                     errorsQualification.length);
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
    assign: assignQualification,
    assignAll: assignAllQualifications,
    prepareArgs: prepareArgs,
    resetGlobals: resetGlobals,
    showStats: showStats
};
