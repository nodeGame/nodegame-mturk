"use strict";

// ## Helper functions.

var J = require('JSUS').JSUS;
var NDDB = require('NDDB').NDDB;
var fs = require('fs-extra');
var path = require('path');

var logger = require('../core/logger')();
var cfg = require('../core/config')();

var req = require('../core/req');
var api = require('../core/mturk-api');

/**
 * ### extendHIT
 *
 *
 *
 */
function extendHIT(args, cb) {
    var data, assInc, expInc;

    if (!api.get(true, cb)) return;

    if (!cfg.HITId) {
        logger.error('no HIT id found. Try "get HITId" first');
        if (cb) cb();
        return;
    }

    assInc = args.options ? args.options.assignments : args.assignments;
    expInc = args.options ? args.options.time : args.time;

    if (!expInc && !assInc) {

        logger.error('ExtendHIT: both MaxAssignmentsIncrement and ' +
                     'ExpirationIncrementInSeconds are missing.');
        if (cb) cb();
        return;
    }

    if (assInc && ('number' !== typeof assInc || assInc < 1)) {
        logger.error('ExtendHIT: MaxAssignmentsIncrement must be ' +
                     'a number > 1 or undefined. Found: ' + assInc);
        if (cb) cb();
        return;
    }

    if (expInc && ('number' !== typeof expInc || assInc < 1)) {
        logger.error('ExtendHIT: MaxAssignmentsIncrement must be ' +
                     'a number > 1 or undefined. Found: ' + assInc);
        if (cb) cb();
        return;
    }

    data = {
        HITId: HITId,
        MaxAssignmentsIncrement: assInc,
        ExpirationIncrementInSeconds: expInc
    };

    shapi.req('ExtendHIT', data, function() {
        logger.info('HIT extended: ' + HITId);
        if (cb) cb();
    }, function(err) {
        logger.error('HIT could **not** be extended: ' + HITId);
        if (cb) cb();
    });

    return true;
}


/**
 * ### expireHIT
 *
 *
 *
 */
function expireHIT(args, cb) {

    if (!api.get(true, cb)) return;

    if (!cfg.HITId) {
        logger.error('not HIT id found. Try "get HITId" first');
        if (cb) cb();
        return;
    }

    req('ForceExpireHIT', {
        HITId: HITId
    }, function() {
        logger.info('HIT expired: ' + HITId);
        if (cb) cb();
    }, function(err) {
        logger.error('HIT could **not** be expired: ' + HITId);
        if (cb) cb();
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
    extendHIT: extendHIT,
    expireHIT: expireHIT
};
