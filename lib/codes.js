"use strict";

// ## Helper functions.

var J = require('JSUS').JSUS;
var NDDB = require('NDDB').NDDB;
var fs = require('fs-extra');
var path = require('path');

var logger = require('./logger')();
var cfg = require('./config')();

var resultsErrors = [];

var inputCodesFile, resultsFile;
var inputCodesErrors, resultsErrors;
var inputCodesDb, resultsDb;

var resultsFile, validateLevel, validateParams;


/**
 * ### loadResults
 *
 *
 *
 */
function loadResults(args, cb) {

    // Checking options.

    // Append and replace db.
    if (args.append && args.replace) {
        logger.error('cannot append and replace results db at the same time.');
        if (cb) cb();
        return;
    }

    // Results File.
    resultsFile = args.resultsFile || cfg.resultsFile;
    if (!resultsFile) {
        logger.error('no results file provided.');
        if (cb) cb();
        return;

    }
    if (!fs.existsSync(resultsFile)) {
        logger.error('results file not found: ' + resultsFile);
        if (cb) cb();
        return;

    }

    logger.info('results file: ' + resultsFile);

    // Validate Level and Params.
    validateLevel = args.validateLevel || cfg.validateLevel;
    logger.info('validation level: ' + validateLevel);

    validateParams = {
        bonusField: cfg.bonusField,
        exitCodeField: cfg.exitCodeField
    };
    if (cfg.HITId) validateParams.HITId = cfg.HITId;

    // Setting up results database for import.

    if (resultsDb) {
        if (args.replace) {
            resultsDb = getResultsDB();
        }
        else if (!args.append) {
            logger.error('results db already found. ' +
                         'Use options: "replace", "append"');

            if (cb) cb();
            return;
        }
    }
    else {
        resultsDb = getResultsDB();
    }

    // Loading results file.
    resultsDb.loadSync(resultsFile, {
        separator: ',',
        quote: '"',
        headers: true
    });
    logger.info('result codes: ' + resultsDb.size());

    if (cb) cb();
    return true;
}

/**
 * ### loadInputCodes
 *
 *
 *
 */
function loadInputCodes(args, cb) {

    // Input Codes.
    inputCodesFile = args.inputCodesFile || cfg.inputCodesFile;
    if (!inputCodesFile) {
        if (!fs.existsSync(inputCodesFile)) {
            logger.error('input codes file not found: ' + inputCodesFile);
            if (cb) cb();
            return;
        }
    }
    logger.info('input codes: ' + inputCodesFile);
    if (inputCodesDb) {
        if (args.replace) {
            inputCodesDb = getInputCodesDB();
        }
        else if (!args.append) {
            logger.error('inputCodes db already found. ' +
                         'Use options: "replace", "append"');
            if (cb) cb();
            return;
        }
    }
    else {
        inputCodesDb = getInputCodesDB();
    }

    inputCodesDb.loadSync(inputCodesFile);
    logger.info('input codes: ' + inputCodesDb.size());
    if (inputCodesErrors.length) {
        logger.error('input codes errors: ' + inputCodesErrors.length);
        logger.error('correct the errors before continuing');
        if (cb) cb();
        return;
    }
    if (cb) cb();
    return true;
}

/**
 * ### getInputCodesDB
 *
 *
 *
 */
function getInputCodesDB() {
    var db;

    inputCodesErrors = [];
    db = new NDDB();

    db.on('insert', function(code) {
        if (!!code.WorkerId) {
            // Add to array, might dump to file in the future.
            inputCodesErrors.push('missing WorkerId');
            logger.error('invalid input code entry: ' + code);
        }
    });
    db.index('id', function(i) { return i.WorkerId; });
    return db;
}

/**
 * ### getResultsDB
 *
 *
 *
 */
function getResultsDB() {
    var db;

    resultsErrors = [];
    db = new NDDB({ update: { indexes: true } });

    db.index('id', function(i) {
        return i.id;
    });
    db.index('wid', function(i) {
        return i.WorkerId;
    });
    db.index('aid', function(i) {
        return i.AssignmentId;
    });
    db.index('exit', function(i) {
        return i[cfg.exitCodeField];
    });

    db.view('bonus', function(i) {
        // Format already checked.
        if (i[cfg.bonusField]) return i;
    });

    db.view('qualification', function(i) {
        // Format already checked.
        if (i.QualificationTypeId) return i;
    });

    db.hash('status', function(i) {
        if (i.Approve) return 'approve';
        if (i.Reject) return 'reject';
        return 'none';
    });

    db.on('insert', function(i) {
        var str, code;

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
        if (this.exit.get(i[cfg.exitCodeField])) {
            str = 'duplicate ExitCode ' + i[cfg.exitCodeField];
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
            str = validateCode(i, validateParams);
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

        // Adding Qualification Type ID, if found.
        if (cfg.QualificationTypeId) {
            i.QualificationTypeId = cfg.QualificationTypeId;
        }

        // We must validate WorkerId and Exit Code (if found in inputCodes db).
        if (inputCodesDb) {
            if (i.id) {
                code = inputCodesDb.id.get(i.id);
                if (!code) {
                    str = 'id not found in inputCodes db: ' + i.id;
                    logger.warn(str);
                    resultsErrors.push(str);
                }
            }

            if (i[cfg.exitCodeField]) {
                if (!code) code = inputCodesDb.exit.get(i[cfg.exitCodeField]);
                if (!code) {
                    str = 'ExitCode not found: ' + i[cfg.exitCodeField];
                }
                else if (i[cfg.exitCodeField] !== code.ExitCode) {
                    str = 'ExitCodes do not match. WorkerId: ' + i.WorkerId +
                        '. ExitCode: ' + i[cfg.exitCodeField] +
                        ' (found) vs ' + code.ExitCode + ' (expected)';
                }
                if (str) {
                    logger.error(str);
                    resultsErrors.push(str);
                }
            }
        }
    });

    return db;
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
    bonusField = opts.bonusField;
    exitCodeField = opts.exitCodeField;
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
                'Found: "' + code.AssignmentStatus + '". WorkerId: ' +
                code.WorkerId;
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
        return 'code.HITId not matching. Expected: ' +
            HITId + '. Found: ' + code.HITid + '. WorkerId: ' + code.WorkerId;
    }

}

module.exports = {
    loadResults: loadResults,
    loadInputCodes: loadInputCodes,
    getResultsDb: function(check, cb) {
        if (check) {
            if (!resultsDb || !resultsDb.size()) {
                logger.error('no results found. load a results file first.');
            }
            if (cb) cb();
            return;
        }
        return resultsDb;
    },
    getInputCodesDb: function() {
        return inputCodesDb;
    }
};
