"use strict";

// ## Balance.

const logger = require('../core/logger')();
const cfg = require('../core/config')();
const api = require('../core/api');

/**
 * ### getAccountBalance
 *
 *
 *
 */
function getAccountBalance(args, cb) {
    if (!api.get(true, cb)) return;

    api.req('GetAccountBalance',
	    {},
	    function(res) {
		if (cb) {
		    cb(null, res.GetAccountBalanceResult[0].AvailableBalance);
		}
	    },
	    function(err) {
		if (cb) cb(err);
	    });
}

/**
 * ### showAvailableAccountBalance
 *
 *
 *
 */
function showAvailableAccountBalance(args, cb) {
    if (!api.get(true, cb)) return;
    args = args || {};
    getAccountBalance({}, function(err, balance) {
	// Balance is missing if api is not available, e.g. dry-mode.
	if (balance && !err) {
	    logger.info((args.text || 'Your balance is: ') +
                        balance.FormattedPrice);
        }
        if (cb) cb();
    });
}

/**
 * ### showAvailableAccountBalance
 *
 *
 *
 */
function showDiffAfterOperation(args, cb) {
    getAccountBalance({}, function(err, oldBalance) {
	if (err) {
	    if (cb) cb(err);
	    return;
	}
        cb(null, function(nestedCb) {
            getAccountBalance({}, function(err, newBalance) {
                logger.info('Original balance: ' +
                            oldBalance.FormattedPrice +
                            ' New balance: ' + newBalance.FormattedPrice +
                            ' (diff: ' +
                            (oldBalance.Amount - newBalance.Amount) + ')');
                if (nestedCb) nestedCb();
            });
        });
    }, function(err) {
	if (cb) cb(err);
    });
    return true;
}

/**
 * ## Exports
 *
 *
 *
 */
module.exports = {
    show: showAvailableAccountBalance,
    showDiff: showDiffAfterOperation,
    get: getAccountBalance
};
