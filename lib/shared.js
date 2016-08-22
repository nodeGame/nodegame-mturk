// ## Helper functions.

var J = require('JSUS').JSUS;
var path = require('path');

module.exports = {
    validateResult: validateResult,
    validateCode: validateCode,
    loadConfig: loadConfig
};

function loadConfig(configPath) {
    var config;

    // Config.
    if (configPath) {
        if (!fs.existsSync(configPath)) {
            logger.error('config file not existing: ' + configPath);
            return;
        }
        config = require(configPath);
    }
    else {
        configPath = path.resolve(__dirname, '..', './conf/mturk.conf.js');
        config = require(configPath);
    }
    if ('object' !== typeof config) {
        logger.error('config require did not return an object. Found: ' +
                     config);
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

    return config;
}

function validateResult(result, opts) {
    var bonusField;
    opts = opts || {};
    bonusField = opts.bonusField || 'bonus';
    if (result[bonusField] < 0 || result[bonusField] > 10) {
        return 'wrong bonus: ' + result[bonusField];
    }
}

/**
 * ### validateCode
 *
 * Validates and type-cast the properties of a code
 *
 * @param {object} The code to validate
 * @param {object} opts Optional. Configures the validation.
 */
function validateCode(code, opts) {
    var bonusField, exitCodeField, HITId;
    var tmp;
    opts = opts || {};
    bonusField = opts.bonusField || 'bonus';
    exitCodeField = opts.exitCodeField || 'ExitCode';
    HITId = opts.HITId;

    if ('object' !== typeof code) {
        return 'code must object. Found: ' + code;
    }

//     if ('string' !== typeof code.id) {
//         return 'code.id must be string. Found: ' + code.id;
//     }

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
        tmp = J.isNumber(code[bonusField]);
        if (false === tmp) {
            return 'code.' + bonusField + ' must be number ' +
                'or undefined. Found ' + code[bonusField] +
                '. WorkerId: ' + code.WorkerId;
        }
        // Make sure it is a number.
        code[bonusField] = tmp;
        if (code[bonusField] < 0) {
            return 'code.' + bonusField + ' cannot be negative: ' +
                code[bonusField] + '. WorkerId: ' + code.WorkerId;
        }
    }

    if (code.Reason &&
        ('string' !== typeof code.Reason || code.Reason.trim() === '')) {


        return 'code.Reason must be string or undefined. ' +
            '. Found ' + code.Reason + '. WorkerId: ' + code.WorkerId;
    }

    if (code[exitCodeField]) {
        if ('string' !== typeof code[exitCodeField] ||
            code[exitCodeField].trim() === '') {

            return 'code.' + exitCodeField + ' must be a non-empty string ' +
                'or undefined. Found ' + code[exitCodeField] +
                '. WorkerId: ' + code.WorkerId;
        }
    }

    if (code.QualificationTypeId) {
        if ('string' !== typeof code.QualificationTypeId ||
            code.QualificationTypeId.trim() === '') {

            return 'code.QualificationTypeId must be string or undefined. ' +
                '. Found ' + code.QualificationTypeId + '. WorkerId: ' +
                code.WorkerId;
        }
    }

    if (code.IntegerValue) {
        tmp = J.isInt(code.IntegerValue);
        if (false === tmp) {
            return 'code.IntegerValue must be string, number or undefined. ' +
                '. Found ' + code.IntegerValue + '. WorkerId: ' + code.WorkerId;
        }
        code.IntegerValue = tmp;
    }

    // Approve or Reject.
    if (code.Reject && code.Approve) {
        return 'Approve and Reject both selected. WorkerId: ' + code.WorkerId;
    }
    else if (!code.Reject && !code.Approve) {
        return 'Neither Approve or Reject selected. WorkerId: ' +
            code.WorkerId;
    }

    if (code.AssignmentStatus) {
        if (code.AssignmentStatus !== 'Submitted') {
            return 'AssignmentStatus must be undefined or "Submitted". ' +
                'Found: ' + code.AssignmentStatus;
        }
    }

    // Constraints: Can be up to 1024 characters
    // (including multi-byte characters).
    // The RequesterFeedback parameter cannot contain ASCII
    // characters 0-8, 11,12, or 14-31. If these characters
    // are present, the operation throws an InvalidParameterValue error.
    if (code.RequesterFeedback) {
        if ('string' !== typeof code.RequesterFeedback ||
            code.RequesterFeedback.trim() === '' ||
            code.RequesterFeedback.length > 1024) {

            return 'Invalid RequesterFeedback: ' +
                code.RequesterFeedback + ' WorkerId: ' + code.WorkerId;
        }
    }

    if (HITId && code.HITId !== HITId) {
        return 'code.HITId does not matching. Expected: ' +
            HITId + '. Found: ' + code.HITid + '. WorkerId: ' + code.WorkerId;
    }

}
