"use strict";

// ## Bonus.

var J = require('JSUS').JSUS;

var logger = require('./logger')();
var cfg = require('./config')();

var codes = require('./codes');
var req = require('./req');

var show = require('./show');
var api = require('./mturk-api');


var totBonusPaid, nBonusGiven, bonusProcessed;
var errorsBonus;

/**
 * ### grantAllBonuses
 *
 *
 *
 */
function grantAllBonuses(args, cb) {
    var res, that, resultsDb;
    var totResults;

    resultsDb = codes.getResultsDb(true, cb);
    if (!resultsDb) return;
    res = api.get(true, cb);
    if (!res) return;

    // Check args.
    if (!prepareArgs(args, cb)) return;

    resetGlobals();

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
 * ### prepareArgs
 *
 *
 *
 */
function prepareArgs(command, args, cb) {
    var res;

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
    return true;
}

/**
 * ### resetGlobals
 *
 *
 *
 */
function resetGlobals() {
    nBonusGiven = 0;
    totBonusPaid = 0;
    bonusProcessed = 0;
    errorsBonus = [];
}


module.exports = {
    grant: grantBonus,
    grantAll: grantAllBonuses,
    prepareArgs: prepareArgs,
    resetGlobals: resetGlobals
};
