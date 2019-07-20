"use strict";

// ## Helper functions.

const J = require('JSUS').JSUS;
const NDDB = require('NDDB').NDDB;
const fs = require('fs-extra');
const path = require('path');

const logger = require('../core/logger')();
const cfg = require('../core/config')();

const api = require('../core/api');

/**
 * ### extendHIT
 *
 *
 *
 */
function extendHIT(args, cb) {
    var data, assInc, expInc;

    logger.error('this command needs updates and it is temporarily disabled.');
    if (cb) cb();
    return;
    
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
        HITId: cfg.HITId,
        MaxAssignmentsIncrement: assInc,
        ExpirationIncrementInSeconds: expInc
    };

    api.req('ExtendHIT', data, function() {
        logger.info('HIT extended: ' + cfg.HITId);
        if (cb) cb();
    }, function(err) {
        logger.error('HIT could **not** be extended: ' + cfg.HITId);
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
function expireHIT(args, cbArgs) {
    var cb;

    logger.error('this command needs updates and it is temporarily disabled.');
    if (cb) cb();
    return;
    
    if (arguments.length === 1) cb = args;
    else cb = cbArgs;

    if (!api.get(true, cb)) return;

    if (!cfg.HITId) {
        logger.error('not HIT id found. Try "get HITId" first');
        if (cb) cb();
        return;
    }

    api.req('ForceExpireHIT', {
        HITId: cfg.HITId
    }, function() {
        logger.info('HIT expired: ' + cfg.HITId);
        if (cb) cb();
    }, function(err) {
        logger.error('HIT could **not** be expired: ' + cfg.HITId);
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
    extend: extendHIT,
    expire: expireHIT
};
