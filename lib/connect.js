"use strict";

var mturk = require('mturk-api');
var logger = require('./logger')();
var cfg = require('./config');

var api;
function connect(cb) {
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



        module.exports.api = api;
        module.exports.cfg = cfg;
        // Careful: if there is an error here, vorpal exits without notice.
        shapi = require('./lib/shared-api.js');
        ///////////////////////////////////////

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

module.exports = function(cb) {
    if (!api) connect(cb);
    else


    return api;
};
