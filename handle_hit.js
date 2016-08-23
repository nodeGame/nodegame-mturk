"use strict";

// General.
var fs = require('fs');
var path = require('path');
var mturk = require('mturk-api');
var _ = require('underscore');
var program = require('commander');
var winston = require('winston');
var NDDB = require('NDDB').NDDB;

// Local.
var version = require('./package.json').version;

var config, file;
var logger;

var validateLevel, validateParams;

var bonusField, exitCodeField;

var uniqueToken, sendNotification, qualificationId;

var DRY_RUN;
var UNIQUE_TOKEN;

UNIQUE_TOKEN = '' + 3000;
DRY_RUN = false;

var HITId, lastHIT;

var inputCodes, results;
results = new NDDB();

var inputCodesErrors, resultsErrors;
inputCodesErrors = [], resultsErrors = [];

var vorpal = require('vorpal')();
// Commander.

program
    .version(version)

     // Specify a configuration file (other inline-options are mixed-in.)
    .option('-C, --config [confFile]',
            'Specifies a configuration file')





    .option('-L, --lastHIT [lastHIT]',
            'Uses the HITId of the last HIT by requester')

//    .option('-T, --hitTitle [hitTitle]',
//            'Uses the HITId of the first HIT with same title by requester')

    .option('-H, --hitId [HITId]',
            'HIT id')

    .option('-v, --validateLevel <level>',/^(0|1|2)$/i, '2')

    .option('-t, --token [token]',
            'Unique token for one-time operations')

    .option('-s, --sandbox',
            'Activate sandbox mode')

    .option('-d, --dry',
            'Dry-run: does not send requests to servers')

    .option('-q, --quiet',
            'No/minimal output printed to console')


// Parsing input parameters.
program.parse(process.argv);

// Create logger.
logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            level: program.quiet ? 'error' : 'silly'
        }),
    ]
});


var log;

module.exports.logger = logger;
module.exports.log = log;

log = function(t) {
    logger.log(t);
    vorpal.log();
};

var err = function(t) {
    logger.log(t);
    vorpal.log();
};

// Load and check config.

var shared = require('./lib/shared');
config = shared.loadConfig(program.config);
config = shared.checkConfig(program, config);

// var validateCode = shared.validateCode;
// var validateResult = shared.validateResult;

// The api command after a connection has been established.
var api, shapi;

vorpal
    .command('connect')
    .action(connect);


vorpal
    .command('get-last-HITId', 'Fetches and stores the last HIT id')
    .action(function(args, callback) {
        if (!api || !shapi) {
            logger.error('api not available. connect first');
            return callback();
        }
        shapi.getLastHIT(function(err, HIT) {
            if (err) {
                logger.error('an error occurred retrieving last HIT id');
                logger.error(err);
                return callback();
            }
            HITId = HIT.HIT[0].HITId;
            lastHIT = HIT.HIT;
            logger.info('retrieved last HIT id: ' + HITId);
            callback();
        });
    });


vorpal
    .command('extendHIT', 'Extends the HIT.')
    .option('-a, --assignments [n]',
            'Adds n assigments to the HIT')
    .option('-t, --time [t]',
            'Adds extra t seconds to the HIT')
    .action(function(args, callback) {
        if (!api || !shapi) {
            logger.error('api not available. connect first');
            return callback();

        }
        if (!HITId) {
            logger.error('not HIT id found. get-last-HITId first');
            return callback();
        }
        extendHIT(args.options, callback);
    });

vorpal
    .command('expireHIT', 'Expires the HIT')
    .action(function(args, callback) {
        var res;
        if (!api || !shapi) {
            logger.error('api not available. connect first');
            return callback();

        }
        if (!HITId) {
            logger.error('not HIT id found. get-last-HITId first');
            return callback();
        }
        expireHIT(callback);
    });


vorpal
  .delimiter('ng-amt$')
  .show();


function extendHIT(args, callback) {
    var data, assInc, expInc;
    assInc = args.assignments;
    expInc = args.time;
    if (!expInc && !assInc) {

        logger.error('ExtendHIT: both MaxAssignmentsIncrement and ' +
                     'ExpirationIncrementInSeconds are missing.');
        callback();
        return;
    }

    if (assInc && ('number' !== typeof assInc || assInc < 1)) {
        logger.error('ExtendHIT: MaxAssignmentsIncrement must be ' +
                     'a number > 1 or undefined. Found: ' + assInc);
        callback();
        return;
    }

    if (expInc && ('number' !== typeof expInc || assInc < 1)) {
        logger.error('ExtendHIT: MaxAssignmentsIncrement must be ' +
                     'a number > 1 or undefined. Found: ' + assInc);
        callback();
        return;
    }

    data = {
        HITId: HITId,
        MaxAssignmentsIncrement: assInc,
        ExpirationIncrementInSeconds: expInc
    };

    shapi.req('ExtendHIT', data, function() {
        logger.info('HIT extended: ' + HITId);
        callback();
    }, function(err) {
        logger.error('HIT could **not** be extended: ' + HITId);
        callback();
    });

    return true;
}


function expireHIT(callback) {
    shapi.req('ForceExpireHIT', {
        HITId: HITId,
    }, function() {
        logger.info('HIT expired: ' + HITId);
        callback();
    }, function(err) {
        logger.error('HIT could **not** be expired: ' + HITId);
        callback();
    });
}



function connect(args, callback) {

    if (api) {
        logger.error('already connected.');
        return callback();
    }

    logger.info('creating mturk client...');

    // Here we start!
    mturk.createClient(config).then(function(mturkapi) {
        logger.info('done.');
        ///////////////////////////////////////
        // Share the api with other commands.
        api = mturkapi;
        module.exports.api = api;
        module.exports.DRY_RUN = DRY_RUN;
        shapi = require('./lib/shared-api.js');
        ///////////////////////////////////////
        callback();


    }).catch(function(err) {
        logger.err('failed.');
        winston.error(err);
        callback();
    });

}
