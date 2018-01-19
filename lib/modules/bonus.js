"use strict";

// ## Bonus.

var J = require('JSUS').JSUS;

var logger = require('../core/logger')();
var cfg = require('../core/config')();
var api = require('../core/api');
var codes = require('../core/codes');

var balance = require('./balance');


var totBonusPaid, nBonusGiven, nProcessed;
var errorsBonus;

/**
 * ### grantAllBonuses
 *
 *
 *
 */
function grantAllBonuses(args, cb) {
    var res, resultsDb;
    var totResults;

    resultsDb = codes.getResultsDb(true, cb);
    if (!resultsDb) return;
    res = api.get(true, cb);
    if (!res) return;

    // Check args.
    if (!prepareArgs(args, cb)) return;

    resetGlobals();

    totResults = resultsDb.size();

    // Show balance difference after all operations are completed.
    balance.showDiff({}, function(done) {
        api.reqArray(resultsDb, args, function(bonus, args) {
            var d = Date.now();
            grantBonus(bonus, function(err) {
                var d1 = Date.now();
                // console.log(resultsDb.size(), totResults, nProcessed,d1-d);
                if (++nProcessed >= totResults) {
                    showStats(args, function() {
                        done(cb);
                    });
                }
            }, args);
        });
    });

    return true;

    balance.showDiff({}, function(done) {
        // Do it!
        resultsDb.each(grantBonus, function(err) {
            if (++nProcessed >= totResults) {
                showStats(args, function() {
                    done(cb);
                });
            }
        }, args);
    });

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
            Amount: data[cfg.fields.bonus],
            CurrencyCode: 'USD'
        },
        Reason: reason
    };

    uniqueToken = args.UniqueRequestToken || data.UniqueRequestToken;

    if (uniqueToken) params.UniqueRequestToken = uniqueToken;

    api.req('GrantBonus', params, function(res) {
        nBonusGiven++;
        totBonusPaid += data[cfg.fields.bonus];
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
    nProcessed = 0;
    nBonusGiven = 0;
    totBonusPaid = 0;
    errorsBonus = [];
}

/**
 * ### showStats
 *
 *
 *
 */
function showStats(args, cb) {
    var nBonus, stdDevBonus, meanBonus;
    var resultsDb, stat;

    resultsDb = codes.getResultsDb(true, cb);
    if (!resultsDb) return;

    stat = codes.getStats('bonus');
    nBonus = stat.count;

    if (nBonus > 1 ) {
        stdDevBonus = (Math.pow(stat.total, 2) / nBonus);
        stdDevBonus = stat.sumSquared - stdDevBonus;
        stdDevBonus = (Math.sqrt( stdDevBonus / (nBonus - 1) )).toFixed(2);
        meanBonus = (stat.total / nBonus).toFixed(2);
    }
    else if (nBonus === 1) {
        meanBonus = stat.max;
    }

    logger.info('bonuses: ' + nBonus);
    if (nBonus > 0) {
        logger.info('bonuses tot:  ' + (stat.total).toFixed(2));
        if (nBonus > 1) {
            logger.info('bonuses mean: ' + meanBonus);
            logger.info('bonuses std:  ' + stdDevBonus);
            logger.info('bonuses min:  ' + stat.min);
            logger.info('bonuses max:  ' + stat.max);
        }
    }
    console.log();

    if (!nProcessed) {
        // logger.warn('results not yet uploaded to amt.');
        if (cb) cb();
        return true;
    }

    logger.info('results processed: ' + nProcessed + '/' + nBonus);
    logger.info('bonuses: ' + nBonusGiven +
                ' (paid: ' + (totBonusPaid || 0) + ')');

    if (errorsBonus && errorsBonus.length) {
        logger.error('bonuses failed: ' + errorsBonus.length);
    }
    console.log();

    if (cb) cb();
    return true;
}

module.exports = {
    grant: grantBonus,
    grantAll: grantAllBonuses,
    prepareArgs: prepareArgs,
    resetGlobals: resetGlobals,
    showStats: showStats
};
