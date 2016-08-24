// ## Helper functions that require an API connection.

"use strict";

var api, logger, cfg;
api = module.parent.exports.api;
cfg = module.parent.exports.cfg;
logger = module.parent.exports.logger;

if (!api) {
    throw new Error('nodegame-mturk shared-api: could not find api object.');
}

var retryInterval, maxTries;
// retryInterval = module.parent.exports.retryInterval;
// maxTries = module.parent.exports.maxTries;
retryInterval = 10000;
maxTries = 2; // Total tries = maxTries +1 default try.

function req(name, params, cbSuccess, cbFail) {
    var cb, retry, timeout, nTries;
    if (cfg.dry) return;
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

// Not possible to search by title. Needs to get back all results,
// and then search amongst those.

function getQualificationType(cb, query) {
    // Properties: Title | Reward | Expiration | CreationTime | Enumeration
    // Sorting: Ascending | Descending

    req('SearchQualificationTypes', {
        SortProperty: 'Name',
        SortDirection: 'Descending',
        PageSize: 1,
        PageNumber: 1,
        // Query: query,
        MustBeOwnedByCaller: true
    }, function(res) {
        console.log();
        cb(null, res.SearchQualificationTypesResult[0].QualificationType);
    }, function(err) {
        cb(err);
    }); // QualificationTypeId:
}

module.exports = {
    req: req,
    getLastHIT: getLastHIT,
    getQualificationType: getQualificationType
};
