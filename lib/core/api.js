"use strict";

// # Api.

var mturk = require('mturk-api');

var logger = require('./logger')();
var cfg = require('./config');

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
        logger.info('done.');

        ///////////////////////////////////////
        // Share the api with other commands.
        api = mturkapi;

        if (args.getQualificationTypeId && args.getLastHITId) {
            getQualificationType({}, function() {
                getLastHITId({}, cb);
            });
        }
        else if (args.getLastHITId) {
            getLastHITId({}, cb);
        }
        else if (args.getQualificationTypeId) {
            getQualificationType({}, cb);
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


var retryInterval, maxTries;
retryInterval = 10000;
maxTries = 2; // Total tries = maxTries +1 default try.

/**
 * ## req
 *
 *
 *
 */
function req(name, params, cbSuccess, cbFail) {
    var cb, retry, timeout, nTries;

    if (cfg.dry) {
        logger.info('dry-mode: skipping request "' + name + '" with params:');
        logger.info(params);
        if (cbSuccess) cbSuccess();
        return;
    }

    if (!getApi(true)) {
        if (cbFail) cbFail(api);
        return;
    }

    nTries = 1;

    retry = function(err) {
        var str, errIdx;

        str = '"' + name + '"';

        if (params.WorkerId) {
            str += ' WorkerId: ' + params.WorkerId;
        }
        if (params.AssignmentId) {
            str += ' AssignmentId ' + params.AssignmentId;
        }

        // Errors cannot be printed easily (only .stack is accessible).
        errIdx = err.stack.indexOf('Error:');
        if (errIdx === -1) {
            logger.error('"' + name + '":');
            logger.error(err.stack);
        }
        else {
            errIdx += 8;
            logger.error('"' + name + '": ' +
                         err.stack.substr(errIdx,
                                          (err.stack.indexOf("\n")-errIdx)));
        }

        clearTimeout(timeout);
        if (++nTries > maxTries) {
              logger.error('reached max number of retries. ' +
                           'Operation: ' + str);

              if (cbFail) cbFail(err);

              return;
          }
        else {
            logger.info('retrying ' + str + ' in ' +
                         (retryInterval/1000) + ' seconds.');
            timeout = setTimeout(function() {
                cb();
            }, retryInterval);
        }
    };

    cb = function() {
        mapi
            .req(name, params)
            .then(function(res) {
                if (timeout) clearTimeout(timeout);
                if (cbSuccess) cbSuccess(res);
            })
            .catch(retry);
    };

    timeout = setTimeout(function() {
        retry('did not get a reply from server.');
    }, retryInterval);

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
    req: req
};
