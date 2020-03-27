"use strict";

// ## Bonus.

const J = require('JSUS').JSUS;

const logger = require('../core/logger')();
const cfg = require('../core/config')();
const api = require('../core/api');
const codes = require('../core/codes');

const balance = require('./balance');

var totBonusPaid, nBonusGiven, nProcessed;
var errorsBonus;

// Make sure that even in programmatic modes, everything is initialized.
resetGlobals();

/**
 * ### grantAllBonuses
 *
 *
 *
 */
function grantAllBonuses(args, cb) {
    let res = api.get(true, cb);
    if (!res) return;

    let resultsDb = codes.getResultsDb(true, cb);
    if (!resultsDb) return;

    // Check args.
    if (!prepareArgs(args, cb)) return;

    resetGlobals();

    let totResults = resultsDb.connected.size();

    // Show balance difference after all operations are completed.
    balance.showDiff({}, function(err, done) {
	// Could not get account on the first place.
	if (err) {
	    console.log(err);
	    logger.error('an error occurred while fetching the ' +
			 'initial account balance');
	    if (cb) cb(err);
	    return;
	}

        api.reqArray(resultsDb.connected, args, function(bonus, args) {
            let d = Date.now();

            grantBonus(bonus, function(err) {
                let d1 = Date.now();
                // console.log(resultsDb.size(), totResults, nProcessed,d1-d);
                if (++nProcessed >= totResults) {
                    console.log();
                    showStats(args, function() {
                        done(cb);
                    });
                }
            }, args);
        });
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
    var bonus;
    args = args || {};

    reason = args.Reason || data[cfg.fields.reason];

    if ('undefined' === typeof reason) {
	err = 'missing Reason for bonus for WorkerId: ' +
            data[cfg.fields.workerId];
    }
    else if ('string' !== typeof reason) {
        err = 'invalid Reason for bonus for WorkerId: ' +
            data[cfg.fields.workerId] +
            '. Found: ' + reason;
    }
    if (err) {
        logger.error(err);
        if (cb) cb(err);
        return;
    }

    bonus = data[cfg.fields.bonus];

    if (!J.isNumber(bonus, 0)) {
        err = 'invalid or zero bonus for WorkerId: ' +
            data[cfg.fields.workerId] +
            '. Found: ' + bonus;
        logger.warn(err);
        if (cb) cb(err);
        return;
    }

    params = {
        WorkerId: data[cfg.fields.workerId],
        AssignmentId: data[cfg.fields.assignmentId],
        BonusAmount: '' + bonus,
        Reason: reason
    };

    uniqueToken = args.UniqueRequestToken || data[cfg.fields.uniqueRequestToken];

    if (uniqueToken) params.UniqueRequestToken = uniqueToken;

    api.req('SendBonus', params, function(res) {
        nBonusGiven++;
        totBonusPaid += bonus;
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

    if (args.Reason) {
        if ('string' !== typeof args.Reason || args.Reason.trim() === '') {
            logger.error('--Reason must be a non-empty string or undefined. ' +
			 'Found: ' + args.Reason);
            if (cb) cb();
            return;
	}
    }
    else {
	logger.warn('--Reason not specified, command will fail for every ' +
		    'worker without a Reason in the results file');
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
