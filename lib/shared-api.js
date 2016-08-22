// ## Helper functions that require an API connection.

var api, DRY_RUN, logger;

api = module.parent.exports.api;
DRY_RUN = module.parent.exports.DRY_RUN;
logger = module.parent.exports.logger;

if (!api) {
    throw new Error('nodegame-mturk shared-api: could not find api object.');
}

module.exports = {

    req: function(name, params) {
        var cb, timeout, nTries;
        if (DRY_RUN) return;

        nTries = 1;
        cb = function() {
            api
                .req(name, params)
                .then(function() {
                    if (timeout) clearTimeout(timeout);
                })
                .catch(function(err) {
                    var str;
                    logger.error(err);
                    str = '"' + name + '" for ' + (params.WorkerId ?
                                  'WorkerId ' + params.WorkerId :
                                  'AssignmentId ' + params.AssignmentId);
                    if (++nTries > maxTries) {
                        logger.error('reached max number of retries. ' +
                                     'Operation: ' + str);
                        clearTimeout(timeout);
                        return;
                    }
                    else {
                        logger.error('retrying ' + str + ' in ' +
                                     (retryInterval/1000) + ' seconds.');
                        timeout = setTimeout(function() {
                            cb();
                        }, retryInterval);
                    }
                });
        };
        cb();
    },

    getLastHIT: function(cb) {

        // Properties: Title | Reward | Expiration | CreationTime | Enumeration
        // Sorting: Ascending | Descending

        api
            .req('SearchHITs', {
                SortProperty: 'CreationTime',
                SortDirection: 'Descending',
                PageSize: 1,
                PageNumber: 1
            })
            .then(function(a) {
                cb(null, a.SearchHITsResult[0]);
            })
            .catch(function(e) {
                cb(e);
            });
    },

};
