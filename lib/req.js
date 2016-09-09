// ## Helper functions that require an API connection.

"use strict";

var logger = require('./logger')();
var cfg = require('./config')();

var retryInterval, maxTries;
// retryInterval = module.parent.exports.retryInterval;
// maxTries = module.parent.exports.maxTries;
retryInterval = 10000;
maxTries = 2; // Total tries = maxTries +1 default try.

module.exports = function req(name, params, cbSuccess, cbFail) {
    var cb, retry, timeout, nTries;
    var api;

    if (cfg.dry) {
        logger.info('dry-mode: skipping request "' + name + '" with params:');
        logger.info(params);
        return;
    }

    api = require('./mturk-api').get(true);
    if (!api) return;

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
        api
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
