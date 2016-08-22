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

var validateLevel, validateParams;

var bonusField, exitCodeField;

var uniqueToken, sendNotification, qualificationId;

var retryInterval, maxTries;

retryInterval = 10000;
maxTries = 2; // Total tries = maxTries +1 default try.

var DRY_RUN;
var UNIQUE_TOKEN, HITId;

UNIQUE_TOKEN = '' + 3000;
DRY_RUN = false;

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
    var reader;

    if (getLastHITId) {

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
            console.log(a.SearchHITsResult[0]);
        })
        .catch(checkIt);

        return;
    }


    function req(name, params) {
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
    }

    function extendHIT(data) {
        var assIncr, expInc;

        assInc = data.MaxAssignmentsIncrement;
        expInc = data.ExpirationIncrementInSeconds;
        if (!expInc && !assInc) {

            throw new Error('ExtendHIT: both MaxAssignmentsIncrement and ' +
                            'ExpirationIncrementInSeconds are missing.');
        }

        if (assInc && ('number' !== typeof assInc || assInc < 1)) {
            throw new TypeError('ExtendHIT: MaxAssignmentsIncrement must be ' +
                                'a number > 1 or undefined. Found: ' + assInc);
        }

        if (expInc && ('number' !== typeof expInc || assInc < 1)) {
            throw new TypeError('ExtendHIT: MaxAssignmentsIncrement must be ' +
                                'a number > 1 or undefined. Found: ' + assInc);
        }

        req('ExtendHIT', data);
    }


    function expireHIT(data) {
        req('ForceExpireHIT', { HITId: HITid });
    }




}).catch(console.error);
