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
var shared = require('./lib/shared');
var validateCode = shared.validateCode;
var validateResult = shared.validateResult;

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

// Commander.

program
    .version(version)

// Specify a configuration file (other inline-options are mixed-in.
    .option('-C, --config [confFile]',
            'Specifies a configuration file')

    .option('-L, --lastHIT [lastHIT]',
            'Uses the HITId of the last HIT by requester')

    .option('-T, --hitTitle [hitTitle]',
            'Uses the HITId of the first HIT with same title by requester')

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

logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            level: program.quiet ? 'error' : 'silly'
        }),
    ]
});

config = shared.loadConfig(program.config);


var getLastHITId;

getLastHITId = true;

// TODO: do the checkings.

logger.info('creating mturk client');

// Here we start!
mturk.createClient(config).then(function(api) {
    var reader, shapi;

    module.exports.api = api;
    module.exports.logger = logger;
    module.exports.DRY_RUN = DRY_RUN;

    shapi = require('./lib/shared-api.js');

    if (getLastHITId) {
        shapi.getLastHIT(function(err, HIT) {
            if (err) {
                logger.error('an error occurred retrieving last HIT id');
                logger.error(err);
                return;
            }
            HITId = HIT.HIT[0].HITId;
            lastHIT = HIT.HIT;
            logger.info('retrieved last HIT id: ' + HITId);
        });
    }

    function extendHIT(data) {
        var assIncr, expInc;

        assInc = data.MaxAssignmentsIncrement;
        expInc = data.ExpirationIncrementInSeconds;
        if (!expInc && !assInc) {

            logger.error('ExtendHIT: both MaxAssignmentsIncrement and ' +
                         'ExpirationIncrementInSeconds are missing.');
            return;
        }

        if (assInc && ('number' !== typeof assInc || assInc < 1)) {
            logger.error('ExtendHIT: MaxAssignmentsIncrement must be ' +
                         'a number > 1 or undefined. Found: ' + assInc);
            return;
        }

        if (expInc && ('number' !== typeof expInc || assInc < 1)) {
            logger.error('ExtendHIT: MaxAssignmentsIncrement must be ' +
                         'a number > 1 or undefined. Found: ' + assInc);
            return;
        }

        data.HITId = '3OWZNK3RYL3FAVW4L3AUMSVTJHJ2UX';

        shapi.req('ExtendHIT', data, function() {
            logger.info('HIT extended: ' + HITId);
        }, function(err) {
            logger.error('HIT could **not** be extended: ' + HITId);
        });

        console.log('extended');
    }


    function expireHIT(data) {
        shapi.req('ForceExpireHIT', {
            HITId: '3OWZNK3RYL3FAVW4L3AUMSVTJHJ2UX'
        }, function() {
            logger.info('HIT expired: ' + HITId);
        }, function(err) {
            logger.error('HIT could **not** be expired: ' + HITId);
        });
    }

    expireHIT();
    return;

    extendHIT({
        // ExpirationIncrementInSeconds: 20000,
        MaxAssignmentsIncrement: 10
    });


}).catch(console.error);
