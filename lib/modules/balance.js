"use strict";

// ## Balance.

var logger = require('../core/logger')();
var cfg = require('../core/config')();
var api = require('../core/api');

/**
 * ### getAccountBalance
 *
 *
 *
 */
function getAccountBalance(args, cb) {
    if (!api.get(true, cb)) return;
    api.req('GetAccountBalance', {}, function(res) {
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
    args = args || {};
    getAccountBalance({}, function(balance) {
        // Balance is missing if api is not available, e.g. dry-mode.
        if (balance) {
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
    getAccountBalance({}, function(oldBalance) {
        cb(function done(nestedCb) {
            getAccountBalance({}, function(newBalance) {
                logger.info('Original balance: ' +
                            oldBalance.FormattedPrice +
                            ' New balance: ' + newBalance.FormattedPrice +
                            ' (diff: ' +
                            (oldBalance.Amount - newBalance.Amount) + ')');
                if (nestedCb) nestedCb();
            });
        });
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
