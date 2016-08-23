// ## Helper functions that require an API connection.

"use strict";

var api, DRY_RUN, logger;

var retryInterval, maxTries;

api = module.parent.exports.api;
DRY_RUN = module.parent.exports.DRY_RUN;
logger = module.parent.exports.logger;

retryInterval = module.parent.exports.retryInterval;
maxTries = module.parent.exports.maxTries;

if (!api) {
    throw new Error('nodegame-mturk shared-api: could not find api object.');
}

module.exports = {
    req: req,
    getLastHIT: getLastHIT,
};

var retryInterval, maxTries;
retryInterval = 10000;
maxTries = 2; // Total tries = maxTries +1 default try.

function req(name, params, cbSuccess, cbFail) {
    var cb, retry, timeout, nTries;
    if (DRY_RUN) return;
    nTries = 1;

    retry = function(err) {
        var str;
        logger.error(err);
        str = '"' + name + '"';
        if (params.WorkerId) {
            str += ' WorkerId: ' + params.WorkerId;
        }
        if (params.AssignmentId) {
            str += ' AssignmentId ' + params.AssignmentId;
        }
        clearTimeout(timeout);
        if (++nTries > maxTries) {
              logger.error('reached max number of retries. ' +
                           'Operation: ' + str);

              if (cbFail) cbFail(err);

              return;
          }
        else {
            logger.error('retrying ' + str + ' in ' +
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

// Not possible to search by title. Needs to get back all results,
// and then search amongst those.

function getLastHIT(cb) {

    // Properties: Title | Reward | Expiration | CreationTime | Enumeration
    // Sorting: Ascending | Descending

    req('SearchHITs', {
        SortProperty: 'CreationTime',
        SortDirection: 'Descending',
        PageSize: 1,
        PageNumber: 1
    }, function(res) {
        cb(null, res.SearchHITsResult[0]);
    }, function(err) {
        cb(err);
    });

}
