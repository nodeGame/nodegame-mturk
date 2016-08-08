var fs = require('fs');
var path = require('path');
var csv = require('ya-csv');
var mturk = require('mturk-api');
var _ = require('underscore');
var program = require('commander');
var winston = require('winston');
var NDDB = require('NDDB').NDDB;

var version = require('./package.json').version;

var config, file;
var validateLevel, uniqueToken, bonusField;

var UNIQUE_TOKEN = '' + 3000;
var DRY_RUN = false;

var inputCodes, results;
results = new NDDB();

var inputCodesErrors, resultsErrors;
inputCodesErrors = [], resultsErrors = [];

// ## Helper functions.

function validateResult(result) {
    if (result[bonusField] < 0 || result[bonusField] > 10) {
        return 'wrong bonus: ' + result[bonusField];
    }
}

function validateCode(code) {

    if ('object' !== typeof code) {
        return 'code must object. Found: ' + code;
    }

    if ('string' === typeof code.id) {
        return 'code.id must be string. Found: ' + code.id;
    }

    if ('string' !== typeof code.WorkerId) {
        return 'code.WorkerId must be string. Found: ' + code.WorkerId;
    }

    if ('string' !== typeof code.AssignmentId) {
        return 'code.AssignmentId must be string. Found: ' +
            code.AssignmentId + '. WorkerId: ' + code.WorkerId;
    }

    if (code.HITId) {
        if ('string' !== typeof code.HITId) {
            return 'code.HITId must be string or undefined. ' +
                code.HITId + '. WorkerId: ' + code.WorkerId;
        }
    }

    if (code[bonusField]) {
        if ('number' !== typeof code[bonusField]) {
            return 'code.' + bonusField + ' must be number ' +
                'or undefined. Found ' + code[bonusField] +
                '. WorkerId: ' + code.WorkerId;
        }
        if (code[bonusField] < 0) {
            return 'code.' + bonusField + ' cannot be negative: ' +
                code[bonusField] + '. WorkerId: ' + code.WorkerId;
        }
    }

    if (code.Reason &&
        ('string' !== typeof code.Reason || code.Reason.trim() === '')) {


        return 'code.Reason must be number or undefined. ' +
            '. Found ' + code.Reason + '. WorkerId: ' + code.WorkerId;
    }

    if (config.HITId && code.HITId !== config.HITId) {
        return 'code.HITId does not match configuration file. ' +
            'Expected: ' + config.HITId + '. Found: ' + code.HITid +
            '. WorkerId: ' + code.WorkerId;
    }
}

// Commander.

program
    .version(version)

    // Specify a configuration file (other inline-options are mixed-in.
    .option('-C, --config [confFile]',
            'Specifies a configuration file')

    .option('-r, --results [resultsFile]',
            'Path to a codes file with Exit and Access Codes')

    .option('-i, --inputCodes [codesFile]',
            'Path to a codes file with Exit and Access Codes')

    .option('-H, --hitId [HITId]',
            'HIT id')

    .option('-v, --validateLevel <level>',/^(0|1|2)$/i, '2')

    .option('-t, --token [token]',
            'Unique token for one-time operations')

    .option('-b, --bonusField [bonusField]',
            'Overwrites the name of the bonus field (default: bonus)')

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

// Config.
if (program.config) {
    if (!fs.existsSync(program.config)) {
        logger.error('config file not existing: ' + program.config);
        return;
    }
    config = require(program.config);
}
else {
    config = require('./conf/mturk.conf.js');
}
if ('object' !== typeof config) {
    logger.error('config require did not return an object. Found: ' + config);
    return;
}

if ('string' !== typeof config.access || config.access.trim() === '') {
    logger.error('config.access must be a non-empty string. Found: ' +
                 config.access);
    return;
}
if ('string' !== typeof config.secret || config.secret.trim() === '') {
    logger.error('config.secret must be a non-empty string. Found: ' +
                 config.secret);
    return;
}
config.sandbox = !!config.sandbox;
logger.info('sandbox-mode: ' + (config.sandbox ? 'on' : '**not active**'));


// Bonus field.
if (program.bonusField) {
    if ('string' !== program.bonusField || program.bonusField.trim() === '') {
        logger.error('bonusField is invalid. Found: ' + program.bonusField);
        return;
    }
    bonusField = program.bonusField;
    logger.info('custom bonus field: ' + bonusField);
}

// File.
if (!program.results) {
    logger.error('no results file provided.');
    return;

}
file = program.results;
if (!fs.existsSync(file)) {
    logger.error('results file not found: ' + file);
    return;

}
logger.info('results file: ' + file);

// Unique Token.
uniqueToken = program.token;
if (!uniqueToken) {
    uniqueToken = UNIQUE_TOKEN;
    logger.info('unique token: ' + uniqueToken + ' (default)');
}
else {
    logger.info('unique token: ' + uniqueToken);
}

// Validate Level.
validateLevel = program.validateLevel;
logger.info('validate level: ' + validateLevel);


// Input Codes.
if (program.inputCodes) {
    if (!fs.existsSync(program.inputCodes)) {
        logger.error('input codes file not found: ' + program.inputCodes);
        return;
    }
    inputCodes = new NDDB();
    inputCodes.on('insert', function(code) {
        if (!code.id && !code.WorkerId) {
            // Add to array, might dump to file in the future.
            inputCodesErrors.push('missing id and WorkerId');
            logger.error('invalid input code entry: ' + code);
        }
    });
    inputCodes.index('id', function(i) { return i.id || i.WorkerId; });
    inputCodes.loadSync(program.inputCodes);
    logger.info('inputCodes found: ' + inputCodes.size());
    if (inputCodesErrors.length) {
        logger.error('input codes errors found: ' + inputCodesErrors.length);
        logger.error('correct the errors before continuing');
        return;
    }
}

if (program.dry) {
    DRY_RUN = true;
}

logger.info('creating mturk client');

// Here we start!
mturk.createClient(config).then(function(api) {
    var params, reader, tmp;

    function req(name, params, then) {
        if (DRY_RUN) return;
        if (then) {
            api.req(name, params).then(then).catch(function(err) {
                logger.error(err);
                // If a token is set try to repeat operation with timeout.
                // if (params.)
            });
        }
        else {
            api.req(name, params).catch(function(err) {
                logger.error(err);
            });
        }
    }

    function approveAndPay(data) {
        var code, wid, op;
        wid = data.WorkerId;
        // We must validate WorkerId and Exit Code (if found in inputCodes db).
        if (inputCodes) {
            code = inputCodes.id.get(wid);
            if (!code) {
                logger.error('WorkerId not found in inputCodes db: ' + wid);
                return;
            }
            if (code.ExitCode && (data.ExitCode !== code.ExitCode)) {
                logger.error('ExitCodes do not match. WorkerId: ' + wid +
                             '. ExitCode: ' + data.ExitCode + ' (found) vs ' +
                             code.ExitCode + ' (expected)');
            }
        }

        // Approve or Reject.
        if (data.Reject && data.Approve) {
            logger.error('Approve and Reject both selected. WorkerId: ' + wid);
            return;
        }
        else if (!data.Reject && !data.Approve) {
            logger.error('Neither Approve and Reject selected. WorkerId: ' +
                         wid);
            return;
        }
        if (data.Reject) {
            if (data[bonusField]) {
                logger.warn('Assignment rejected, but bonus found. WorkerId: ' +
                            wid);
            }
            op = 'Reject';
        }
        else {
            op = 'Approve';
        }

        params = { AssignementId: data.AssignmentId };

        // Constraints: Can be up to 1024 characters
        // (including multi-byte characters).
        // The RequesterFeedback parameter cannot contain ASCII
        // characters 0-8, 11,12, or 14-31. If these characters
        // are present, the operation throws an InvalidParameterValue error.
        if (data.RequesterFeedback) {
            if ('string' !== typeof data.RequesterFeedback) {
                logger.error('Invalid RequesterFeedback: ' +
                             data.RequesterFeedback + ' WorkerId: ' + wid);
            }
            params.RequesterFeedback = data.RequesterFeedback;
        }

        // No bonus granting if assignment is rejected.
        if (code[bonusField] && op !== 'Reject') {
            params = {
                WorkerId: code.WorkerId,
                AssignmentId: code.AssignementId,
                BonusAmount: {
                    Amount: code[bonusField],
                    CurrencyCode: 'USD'
                },
                UniqueRequestToken: that.getUniqueToken()
            };
            if (code.Reason) params.Reason = code.Reason;

            req(op + 'Assignment', params, function() {


            });
        }
        else {
            req(op + 'Assignment', params);
        }

    }

    tmp = path.extname(file);


    if (validateLevel) {
        results.on('insert', function(i) {
            var str;
            // Standard validation.
            str = validateCode(i);
            if (str) {
                resultsErrors.push(str);
                return;
            }
            // Custom validation.
            if ('function' === typeof validateResult) {
                str = validateResult(data);
                if ('string' === typeof str) {
                    resultsErrors.push(str);
                    logger.error('custom validation failed: ' + tmp + '. ' +
                                 'WorkerId: ' + wid);
                    return;
                }
            }
        });
    }
debugger
    results.loadSync(file, {
        separator: ',',
        quote: '"',
        headers: true,
        // columnsFromHeader: true // ya-csv
    });

//     if (tmp === 'csv') {
//         reader = csv.createCsvFileReader(file, { columnsFromHeader: true });
//         reader.addListener('data', approveAndPay);
//     }
//     else {
//         winston.error('available file extensions: .csv. Found: ' + tmp);
//     }




}).catch(console.error);
