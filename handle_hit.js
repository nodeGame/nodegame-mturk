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

    .option('-c, --connect',
            'Opens the connection with Mturk Server')

    .option('-L, --lastHITId [lastHITId]',
            'Fetches the last HIT id by requester')

//    .option('-T, --hitTitle [hitTitle]',
//            'Uses the HITId of the first HIT with same title by requester')

    .option('-H, --HITId [HITId]',
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
module.exports.logger = logger;

// Load and check config.
/////////////////////////

var shared = require('./lib/shared');
config = shared.loadConfig(program.config);
config = shared.checkConfig(program, config);
if (!config) return;

// var validateCode = shared.validateCode;
// var validateResult = shared.validateResult;

// The api command after a connection has been established.
var api, shapi, options;

// VORPAL COMMANDS
//////////////////

vorpal
    .command('connect')
    .action(connect);

vorpal
    .command('get-last-HITId', 'Fetches and stores the last HIT id')
    .action(getLastHITId);

vorpal
    .command('extendHIT', 'Extends the HIT.')
    .option('-a, --assignments [n]',
            'Adds n assigments to the HIT')
    .option('-t, --time [t]',
            'Adds extra t seconds to the HIT')
    .action(extendHIT);

vorpal
    .command('expireHIT', 'Expires the HIT')
    .action(expireHIT);

// END VORPAL COMMANDS
//////////////////////


// DEFAULT ACTION (from program)
////////////////////////////////

if (program.connect) {
    options = program.lastHITId ? { getLastHITId: true } : {};
    connect(options, function() {
        vorpal
            .delimiter('ng-amt$')
            .show();
    });
}
else {
    vorpal
        .delimiter('ng-amt$')
        .show();
}

// END DEFAUL ACTION
/////////////////////////////



// FUNCTIONS
////////////

function extendHIT(args, cb) {
    var data, assInc, expInc;

    if (!api || !shapi) {
        logger.error('api not available. connect first');
        if (cb) cb();
        return;
    }
    if (!HITId) {
        logger.error('not HIT id found. get-last-HITId first');
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
        HITId: HITId,
        MaxAssignmentsIncrement: assInc,
        ExpirationIncrementInSeconds: expInc
    };

    shapi.req('ExtendHIT', data, function() {
        logger.info('HIT extended: ' + HITId);
        if (cb) cb();
    }, function(err) {
        logger.error('HIT could **not** be extended: ' + HITId);
        if (cb) cb();
    });

    return true;
}


function expireHIT(args, cb) {
    if (!api || !shapi) {
        logger.error('api not available. connect first');
        if (cb) cb();
        return;

    }
    if (!HITId) {
        logger.error('not HIT id found. get-last-HITId first');
        if (cb) cb();
        return;
    }

    shapi.req('ForceExpireHIT', {
        HITId: HITId,
    }, function() {
        logger.info('HIT expired: ' + HITId);
        if (cb) cb();
    }, function(err) {
        logger.error('HIT could **not** be expired: ' + HITId);
        if (cb) cb();
    });
    return true;
}


function connect(args, cb) {
    if (api) {
        logger.error('already connected.');
        if (cb) cb();
        return;
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
        if (args.getLastHITId) {
            getLastHITId({}, cb);
        }
        else if (cb) {
            cb();
        }

    }).catch(function(err) {
        logger.err('failed.');
        winston.error(err);
        if (cb) cb();
    });

    return true;
}

function getLastHITId(args, cb) {
    if (!api || !shapi) {
        logger.error('api not available. connect first');
        if (cb) cb();
        return;
    }
    shapi.getLastHIT(function(err, HIT) {
        if (err) {
            logger.error('an error occurred retrieving last HIT id');
            logger.error(err);
            if (cb) cb();
            return;
        }
        HITId = HIT.HIT[0].HITId;
        lastHIT = HIT.HIT;
        logger.info('retrieved last HIT id: ' + HITId);
        if (cb) cb();
    });
}
