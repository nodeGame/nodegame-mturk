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
maxTries = 3;

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

    .option('-r, --results [resultsFile]',
            'Path to a codes file with Exit and Access Codes')

    .option('-i, --inputCodes [codesFile]',
            'Path to a codes file with Exit and Access Codes')

    .option('-H, --hitId [HITId]',
            'HIT id')

    .option('-v, --validateLevel <level>',/^(0|1|2)$/i, '2')

    .option('-t, --token [token]',
            'Unique token for one-time operations')

    .option('-q, --qualificationId [qualificationTypeId]',
            'Assigns also a qualification')

    .option('-b, --bonusField [bonusField]',
            'Overwrites the name of the bonus field (default: bonus)')

    .option('-e, --exitCodeField [exitCodeField]',
            'Overwrites the name of the exit code field ' +
            '(default: Answer.surveycode)')

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

if (program.dry) {
    DRY_RUN = true;
    logger.info('dry mode: on');
}

// Sandbox.
config.sandbox = 'undefined' === typeof program.sandbox ?
    !!config.sandbox : !!program.sandbox;

logger.info('sandbox-mode: ' + (config.sandbox ? 'on' : '**not active**'));

// Hit Id.
if (program.hitId || config.hitId) {
    HITId = program.hitId || config.hitId;
    if ('string' !== typeof HITId || HITId.trim() === '') {
        logger.error('hitId is invalid. Found: ' + HITId);
        return;
    }
}

// Bonus field.
if (program.bonusField || config.bonusField) {
    bonusField = program.bonusField || config.bonusField;
    if ('string' !== typeof bonusField || bonusField.trim() === '') {
        logger.error('bonusField is invalid. Found: ' + bonusField);
        return;
    }
    logger.info('custom bonus field: ' + bonusField);
}

// ExitCode field.
if (program.exitCodeField || config.exitCodeField) {
    exitCodeField = program.exitCodeField || exitCodeField;
    if ('string' !== typeof exitCodeField || exitCodeField.trim() === '') {
        logger.error('exitCodeField is invalid. Found: ' + exitCodeField);
        return;
    }
    logger.info('custom exit code field: ' + exitCodeField);
}


// Qualification Type Id.
if (program.qualificationId || config.QualificationTypeId) {
    qualificationId = program.qualificationId || config.QualificationTypeId;
    if ('string' !== typeof qualificationId || qualificationId.trim() === '') {
        logger.error('qualificationId is invalid. Found: ' + qualificationId);
        return;
    }
    logger.info('qualification type id: ' + qualificationId);
}

// Send Notification when granting qualification.
sendNotification = !!(program.sendNotification || config.sendNotification);
logger.info('notify qualification: ' + (sendNotification ? 'on' : 'off'));

// Results File.
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

// Input Codes.
if (program.inputCodes) {
    if (!fs.existsSync(program.inputCodes)) {
        logger.error('input codes file not found: ' + program.inputCodes);
        return;
    }
    logger.info('input codes: ' + program.inputCodes);
    inputCodes = new NDDB();
    inputCodes.on('insert', function(code) {
        if (!!code.WorkerId) {
            // Add to array, might dump to file in the future.
            inputCodesErrors.push('missing WorkerId');
            logger.error('invalid input code entry: ' + code);
        }
    });
    inputCodes.index('id', function(i) { return i.WorkerId; });
    inputCodes.loadSync(program.inputCodes);
    logger.info('input codes: ' + inputCodes.size());
    if (inputCodesErrors.length) {
        logger.error('input codes errors: ' + inputCodesErrors.length);
        logger.error('correct the errors before continuing');
        return;
    }
}

// Unique Token.
uniqueToken = program.token;
if (!uniqueToken) {
    uniqueToken = UNIQUE_TOKEN;
    logger.info('unique token: ' + uniqueToken + ' (default)');
}
else {
    logger.info('unique token: ' + uniqueToken);
}

// Validate Level and Params.
validateLevel = program.validateLevel;
logger.info('validation level: ' + validateLevel);
validateParams = {
    bonusField: bonusField,
    exitCodeField: exitCodeField
};
if (HITId) validateParams.HITId = HITId;

// Setting up results database for import.

results.index('id', function(i) {
    return i.id;
});
results.index('wid', function(i) {
    return i.WorkerId;
});
results.index('aid', function(i) {
    return i.AssignmentId;
});
results.index('exit', function(i) {
    return i[exitCodeField];
});

results.on('insert', function(i) {
    var str;

    // Check no duplicates.
    if (this.id.get(i.id)) {
        str = 'duplicate code id ' + i.id;
        logger.error(str);
        resultsErrors.push(str);
    }
    if (this.wid.get(i.WorkerId)) {
        str = 'duplicate WorkerId ' + i.WorkerId;
        logger.error(str);
        resultsErrors.push(str);
    }
    if (this.exit.get(i[exitCodeField])) {
        str = 'duplicate ExitCode ' + i[exitCodeField];
        logger.error(str);
        resultsErrors.push(str);
    }
    if (this.aid.get(i.AssignmentId)) {
        str = 'duplicate AssignmentId ' + i.AssignmentId;
        logger.error(str);
        resultsErrors.push(str);
    }

    if (validateLevel) {
        // Standard validation.
        str = validateCode(i, validateParams)
        if (str) {
            resultsErrors.push(str);
            logger.error(str);
        }
        // Custom validation.
        else if ('function' === typeof validateResult) {
            str = validateResult(i, validateParams);
            if ('string' === typeof str) {
                resultsErrors.push(str);
                logger.error(str);
            }
        }
    }

    // We must validate WorkerId and Exit Code (if found in inputCodes db).
    if (inputCodes) {
        if (i.id) {
            code = inputCodes.id.get(i.id);
            if (!code) {
                str = 'id not found in inputCodes db: ' + i.id;
                logger.warn(str);
                resultsErrors.push(str);
            }
        }

        if (i[exitCodeField]) {
            if (!code) code = inputCodes.exit.get(i[exitCodeField]);
            if (!code) {
                str = 'ExitCode not found: ' + i[exitCodeField];
            }
            else if (i[exitCodeField] !== code.ExitCode) {
                str = 'ExitCodes do not match. WorkerId: ' + i.WorkerId +
                    '. ExitCode: ' + i[exitCodeField] + ' (found) vs ' +
                    code.ExitCode + ' (expected)'
            }
            if (str) {
                logger.error(str);
                resultsErrors.push(str);
            }
        }
    }

});


// Loading results file.
results.loadSync(file, {
    separator: ',',
    quote: '"',
    headers: true
});

logger.info('result codes: ' + results.size());

if (resultsErrors.length) {
    logger.error('result codes errors: ' + resultsErrors.length);
    logger.error('correct the errors before continuing');
    return;
}


logger.info('creating mturk client');

// Here we start!
mturk.createClient(config).then(function(api) {
    var reader;

    function req(name, params) {
        var cb, interval, nTries;
        if (DRY_RUN) return;

        cb = function() {
            api
                .req(name, params)
                .then(function() {
                    if (interval) clearInterval(interval);
                })
                .catch(function(err) {
                    logger.error(err);
                });
        };
        cb();
        nTries = 1;
        interval = setInterval(function() {
            if (++nTries > maxTries) {
                logger.error('reached max number of retries. Operation: ' +
                             name + 'WorkerId: ' + params.WorkerId);
                clearInterval(interval);
                return;
            }
            cb();
        }, retryInterval);
    }

    function approveAndPay(data) {
        var code, id, wid, qid, op, params, paramsQualification;

        id = data.id;
        wid = data.WorkerId;

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

        if (params.RequesterFeedback) {
            params.RequesterFeedback = data.RequesterFeedback;
        }

        // No bonus granting if assignment is rejected.
        if (code[bonusField] && op !== 'Reject') {


            req(op + 'Assignment', params, function() {
                params = {
                    WorkerId: code.WorkerId,
                    AssignmentId: code.AssignementId,
                    BonusAmount: {
                        Amount: code[bonusField],
                        CurrencyCode: 'USD'
                    },
                    UniqueRequestToken: uniqueToken
                };
                if (code.Reason) params.Reason = code.Reason;
                req('GrantBonus', params);
            });
        }
        else {
            req(op + 'Assignment', params);
        }

        // Qualification.
        qid = data.QualificationTypeId || qualificationId;
        if (!qid) return;

        paramsQualification = {
            WorkerId: data.WorkerId,
            QualificationTypeId: qid,
            SendNotification: !!data.SendNotification || sendNotification
        };

        if (data.IntegerValue) {
            paramsQualification.IntegerValue = data.IntegerValue;
        }

        req('AssignQualification', paramsQualification);

    }

    // Do it!
    results.each(approveAndPay);


}).catch(console.error);
