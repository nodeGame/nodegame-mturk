"use strict";

// # Mturk-api

var mturk = require('mturk-api');

var logger = require('./logger')();
var cfg = require('./config');

var api;
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

/**
 * ## Exports
 *
 *
 *
 */
module.exports = {
    get: function(check, cb) {
        if (check && !api) {
            logger.error('api not available. Try "connect" first');
            if (cb) cb();
            return false;
        }
        return api;
    },
    connect: connect
};
