"use strict";

// ## Balance.

var logger = require('../core/logger')();
var cfg = require('../core/config')();

var api = require('../core/mturk-api');
var req = require('../core/req');

/**
 * ### getAccountBalance
 *
 *
 *
 */
function getAccountBalance(args, cb) {
    if (!api.get(true, cb)) return;
    req('GetAccountBalance', {}, function(res) {
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
    getAccountBalance({}, function(balance) {
        logger.info((args.text || 'Your balance is: ') +
                    balance.FormattedPrice);
        if (cb) cb();
    });
}

module.exports = {
    show: showAvailableAccountBalance,
    get: getAccountBalance
};
