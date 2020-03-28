"use strict";

// ## Balance.

const logger = require('../core/logger')();
const cfg = require('../core/config')();
const api = require('../core/api');

/**
 * ### getAccountBalance
 *
 */
 function getAccountBalance(args, cb) {
     if (!api.get(true, cb)) return;

     api.req('GetAccountBalance', {},
     res => {
         if (cb) cb(null, res.AvailableBalance);
     },
     err => {
         if (cb) cb(err);
     });
 }

/**
 * ### showAvailableAccountBalance
 *
 */
 function showAvailableAccountBalance(args, cb) {
     if (!api.get(true, cb)) return;
     args = args || {};
     getAccountBalance({}, (err, balance) => {
         // Balance is missing if api is not available, e.g. dry-mode.
         if (balance && !err) {
             logger.info((args.text || 'Your balance is: ') + balance);
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
     getAccountBalance({}, (err, oldBalance) => {
         if (err) {
             if (cb) cb(err);
             return;
         }
         cb(null, function(nestedCb) {
             getAccountBalance({}, (err, newBalance) => {
                 logger.info('Original balance: ' + oldBalance +
                             ' New balance: ' + newBalance +
                             ' (diff: ' + (oldBalance - newBalance) + ')');
                 if (nestedCb) nestedCb();
             });
         });
     }, err => {
         if (cb) cb(err);
     });
     return true;
 }

 /**
 * ## Exports
 *
 *
 */
module.exports = {
    show: showAvailableAccountBalance,
    showDiff: showDiffAfterOperation,
    get: getAccountBalance
};
