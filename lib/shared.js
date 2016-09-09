"use strict";

// ## Helper functions.

var J = require('JSUS').JSUS;
var fs = require('fs-extra');
var path = require('path');

var logger = module.parent.exports.logger;

module.exports = {
    validateResult: validateResult,
    validateCode: validateCode,
    loadConfig: loadConfig,
    checkConfig: checkConfig
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

function checkConfig(prg, cfg) {
    var tmp;

    // Dry-run.
    cfg.dry = !!(prg.dry || cfg.dry);
    if (cfg.dry) logger.info('dry mode: on');

    // Sandbox.
    cfg.sandbox = 'undefined' === typeof prg.sandbox ?
        !!cfg.sandbox : !!prg.sandbox;

    logger.info('sandbox-mode: ' + (cfg.sandbox ? 'on' : '**not active**'));

    // HIT Id.
    if (prg.HITId || cfg.HITId) {
        cfg.HITId = prg.HITId || cfg.HITId;
        if ('string' !== typeof cfg.HITId || cfg.HITId.trim() === '') {
            logger.error('HIT id is invalid. Found: ' + cfg.HITId);
            return;
        }
        else {
            logger.info('HIT id: ' + cfg.HITId);
        }
    }

    // Bonus field.
    if (prg.bonusField || cfg.bonusField) {
        cfg.bonusField = prg.bonusField || cfg.bonusField;
        if ('string' !== typeof cfg.bonusField ||
            cfg.bonusField.trim() === '') {

            logger.error('bonusField is invalid. Found: ' + cfg.bonusField);
            return;
        }
        logger.info('custom bonus field: ' + cfg.bonusField);
    }
    else {
        cfg.bonusField = 'bonus';
    }

    // ExitCode field.
    if (prg.exitCodeField || cfg.exitCodeField) {
        cfg.exitCodeField = prg.exitCodeField || cfg.exitCodeField;
        if ('string' !== typeof cfg.exitCodeField ||
            cfg.exitCodeField.trim() === '') {

            logger.error('exitCodeField is invalid. Found: ' +
                         cfg.exitCodeField);
            return;
        }
        logger.info('custom exit code field: ' + cfg.exitCodeField);
    }
    else {
        cfg.exitCodeField = 'ExitCode';
    }

    // Qualification Type Id.
    if (prg.qualificationId || cfg.QualificationTypeId) {
        cfg.qualificationId = prg.qualificationId || cfg.QualificationTypeId;

        if ('string' !== typeof cfg.qualificationId ||
            cfg.qualificationId.trim() === '') {

            logger.error('qualificationId is invalid. Found: ' +
                         cfg.qualificationId);
            return;
        }
        logger.info('qualification type id: ' + cfg.qualificationId);
    }

    // Send Notification when granting qualification.
    if ('undefined' !== typeof prg.sendNotification) {
        cfg.sendNotification = !!prg.sendNotification;
        logger.info('notify qualification: ' +
                    (cfg.sendNotification ? 'on' : 'off'));
    }

    // Token for sensitive operations.
    if ('undefined' !== typeof prg.token || 'undefined' !== typeof cfg.token) {
        cfg.token = prg.token || cfg.token;
        if ('number' !== typeof cfg.token) {
            logger.error('token must be number. Found: ' + cfg.token);
            return;
        }
        if (cfg.token === 0) {
            logger.error('token must cannot be zero.');
            return;
        }
    }
    else {
        cfg.token = 3000;
    }

    // Results file.
    if (prg.resultsFile || cfg.resultsFile) {
        cfg.resultsFile = prg.resultsFile || cfg.resultsFile;

        if ('string' !== typeof cfg.resultsFile ||
            cfg.resultsFile.trim() === '') {

            logger.error('resultsFile is invalid. Found: ' +
                         cfg.resultsFile);
            return;
        }
        // Will be printed later.
        // logger.silly('results file: ' + cfg.resultsFile);
    }

    // Input codes file.
    if (prg.inputCodesFile || cfg.inputCodesFile) {
        cfg.inputCodesFile = prg.inputCodesFile || cfg.inputCodesFile;

        if ('string' !== typeof cfg.inputCodesFile ||
            cfg.inputCodesFile.trim() === '') {

            logger.error('inputCodesFile is invalid. Found: ' +
                         cfg.inputCodesFile);
            return;
        }
        // Will be printed later.
        // logger.silly('input codes file: ' + cfg.inputCodesFile);
    }

    // Validate Level
    if ('undefined' !== typeof prg.validateLevel) {
        cfg.validateLevel = J.isInt(prg.validateLevel);
    }
    if ('undefined' !== typeof cfg.validateLevel) {

        if ('number' !== typeof cfg.validateLevel ||
            cfg.validateLevel < 0) {

            logger.error('validateLevel is invalid. Found: ' +
                        cfg.validateLevel);
            return;
        }
        logger.info('validation level: ' + cfg.validateLevel);
    }
    else {
        cfg.validateLevel = 2;
    }


    // Cannot have two conflicting command-line options.
    if (prg.HITId && prg.lastHITId) {
        logger.error('options HIT and lastHITId cannot be set ' +
                     'at the same time.');
        return;
    }

    return cfg;
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
