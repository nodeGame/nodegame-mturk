"use strict";

// # Api.

var mturk = require('mturk-api');
var logger = require('./logger')();
var cfg = require('./config')();

var J = require('JSUS').JSUS;

var queue = J.getQueue();

var api;

/**
 * ## connect
 *
 *
 *
 */
function connect(args, cb) {
    if (api) {
        logger.error('already connected.');
        if (cb) cb(api);
        return;
    }

    logger.info('creating mturk client...');

    // Here we start!
    mturk.createClient(cfg).then(function(mturkapi) {
        var get;

        api = mturkapi;
        logger.info('done.');

        if (args.getQualificationTypeId || args.getLastHITId) {
            get = require('../modules/get');
        }

        if (args.getQualificationTypeId && args.getLastHITId) {
            get.qualificationType({}, function() {
                get.lastHITId({}, cb);
            });
        }
        else if (args.getLastHITId) {
            get.lastHITId({}, cb);
        }
        else if (args.getQualificationTypeId) {
            get.qualificationType({}, cb);
        }
        else if (cb) {
            cb();
        }

    }).catch(function(err) {
        logger.err('failed.');
        logger.error(err);
        if (cb) cb();
    });

    return true;
}

var retryInterval, maxRetries, retrIntSecs;
var throttleInterval;

throttleInterval = cfg.throttleInterval;
retryInterval = cfg.retryInterval;
maxRetries = cfg.nRetries;
retrIntSecs = retryInterval / 1000;
if (!J.isInt(retrIntSecs)) retrIntSecs = Number(retrIntSecs).toFixed(1);


/**
 * ## reqArray
 *
 * Executes functions calling `req` making sure they do not timeout/error
 *
 *
 * @see req
 */
function reqArray(array, args, reqCb, cbSuccess, cbFail) {
    var counter;
    counter = 0;
    array.each(function(item) {
        setTimeout(function() {
            reqCb(item, args);
        }, throttleInterval * (++counter));
    });
}

/**
 * ## req
 *
 *
 *
 */
function req(name, params, cbSuccess, cbFail) {
    var cb, retry, timeout, nTries, str, withParams;

    if (cfg.dry) {
        str = 'dry-mode: skipping request "' + name + '"';
        withParams = params && !J.isEmpty(params);
        if (withParams) str += ' with params: ';
        logger.info(str);
        if (withParams) logger.info(params);
        if (cbFail) cbFail('dry-mode skipped request');
        return;
    }

    if (!getApi(true)) {
        if (cbFail) cbFail(api);
        return;
    }

    // Number of times tried.
    nTries = 0;

    retry = function(err) {
        var str, errStr, errIdx;

        str = '"' + name + '"';

        if (params.WorkerId) {
            str += ' WorkerId: ' + params.WorkerId;
        }
        if (params.AssignmentId) {
            str += ' AssignmentId ' + params.AssignmentId;
        }

        // Errors cannot be printed easily (only .stack is accessible).
        if (err.stack) {
            errIdx = err.stack.indexOf('Error:');
            if (errIdx !== -1) errIdx += 'Error:'.length;
            else {
                errIdx = err.stack.indexOf('TypeError:');
                if (errIdx !== -1) errIdx += 'TypeError:'.length;
            }
        }

        // Full stack (unknown error).
        if (errIdx === -1) {
            logger.error('"' + name + '":');
            logger.error(err.stack || err);
        }
        // Parsed error.
        else {
            errStr = err.stack ?
                err.stack.substr(errIdx, (err.stack.indexOf("\n") - errIdx)) :
                err;

            logger.error('"' + name + '": ' + errStr);
        }

        if (timeout) clearTimeout(timeout);

        if (++nTries >= maxRetries) {

            // If any retry was done at all.
            if (maxRetries) {
                logger.error('reached max number of retries (' +
                             maxRetries + '). ' + 'Operation: ' + str);
            }
            if (cbFail) cbFail(err);

            return;
        }
        else {
            logger.info('retrying ' + str + ' in ' + retrIntSecs + ' seconds.');
            timeout = setTimeout(function() {
                cb();
            }, retryInterval);
        }
    };

    cb = function() {
        api.req(name, params)
            .then(function(res) {
                if (timeout) clearTimeout(timeout);
                if (cbSuccess) cbSuccess(res);
            })
            .catch(retry);
    };

    if (maxRetries) {
        timeout = setTimeout(function() {
            retry('did not get a reply from server.');
        }, retryInterval);
    }

    cb();
}

/**
 * ## getApi
 *
 *
 *
 */
function getApi(check, cb) {
    if (check && !api) {
        logger.error('api not available. Try "connect" first');
        if (cb) cb();
        return false;
    }
    return api;
}

/**
 * ## Exports
 *
 *
 *
 */
module.exports = {
    get: getApi,
    connect: connect,
    req: req,
    reqArray: reqArray
};
