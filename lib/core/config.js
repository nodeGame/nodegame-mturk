"use strict";

// # Config.

var fs = require('fs-extra');
var J = require('JSUS').JSUS;
var path = require('path');

var logger = require('./logger')();

var config;
var defaultFields;
var defaultMaxBonus;
var defaultMinBonus;

defaultFields = {

    id: 'id',

    bonus: 'bonus',

    workerId: 'WorkerId',

    assignmentId: 'AssignmentId',

    hitId: 'HITId',

    approve: 'Approve',

    reject: 'Reject',

    // Notice: in the results file obtained from AMT, it is named after
    // the id of the HTML input element in the MTurk frame.
    exitCode: 'exit',

    accessCode: 'access',

    qualificationTypeId: 'QualificationTypeId',

    reason: 'Reason',

    integerValue: 'IntegerValue',

    assignmentStatus: 'AssignmentStatus',

    requesterFeedback: 'RequesterFeedback'
};

defaultMinBonus = 0;
defaultMaxBonus = 10;

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
        configPath = path.resolve(__dirname, '..', '..', 'conf/mturk.conf.js');
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
    var tmp, field;

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

    // Deprecated options from previous version.
    if (cfg.bonusField) {
        logger.error('**bonusField is deprecated. Use fields.bonus instead**');
        return;
    }
    if (cfg.exitCodeField) {
        logger.error('**exitCodeField is deprecated. ' +
                     'Use fields.exit instead**');
        return;
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
        logger.info('qualification id: ' + cfg.qualificationId);
    }

    // Send Notification when granting qualification.
    if ('undefined' !== typeof prg.sendNotification) {
        cfg.sendNotification = !!prg.sendNotification;
        logger.info('notify qualification: ' +
                    (cfg.sendNotification ? 'on' : 'off'));
    }

    // Token for sensitive operations.
    if ('undefined' !== typeof prg.UniqueRequestToken ||
        'undefined' !== typeof cfg.UniqueRequestToken) {

        cfg.UniqueRequestToken =
            prg.UniqueRequestToken || cfg.UniqueRequestToken;

        if ('number' !== typeof cfg.UniqueRequestToken) {
            logger.error('UniqueRequestToken must be number. Found: ' +
                         cfg.UniqueRequestToken);
            return;
        }
        if (cfg.UniqueRequestToken === 0) {
            logger.error('UniqueRequestToken cannot be zero.');
            return;
        }
    }
    else {
        cfg.UniqueRequestToken = 3000;
    }

    // Fields.
    if (cfg.fields) {
        if ('object' !== typeof cfg.fields) {
            logger.error('config.fields must be object. Found:' + cfg.fields);
            return;
        }
    }
    else {
        cfg.fields = {};
    }
    for (field in defaultFields) {
        if (defaultFields.hasOwnProperty(field)) {
            tmp = checkField(cfg.fields, field);
            if (!tmp) return;
            cfg.fields[field] = tmp;
        }
    }

    // Filter.
    if (cfg.filter) {
        if ('function' !== typeof cfg.filter) {
            logger.error('config.filter must be function or undefined. ' +
                         'Found: ' + cfg.filter);
            return;
        }
        else {
            logger.info('filter results: on');
        }
    }

    // Case-Insensitive.
    if (cfg.fieldsCaseInsensitive) {
        logger.info('case-insensitive fields: on (fast mode)');
    }

    // AutoApprove
    if (cfg.autoApprove) {
        logger.info('auto-approve: on');
    }

    // Bonus: min/max

    tmp = cfg.maxBonus;
    if ('undefined' !== typeof tmp) {
        if (isNaN(tmp) || !isFinite(tmp) || tmp < 0) {
            logger.error('config.maxBonus must be number >= 0. Found: ' + tmp);
            return;
        }
    }
    else {
        cfg.maxBonus = defaultMaxBonus;
    }

    tmp = cfg.minBonus;
    if ('undefined' !== typeof tmp) {
        if (isNaN(tmp) || !isFinite(tmp) || tmp < 0) {
            logger.error('config.minBonus must be number >= 0. Found: ' + tmp);
            return;
        }
    }
    else {
        cfg.minBonus = defaultMinBonus;
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

    // Number of re-tries for request.
    if ('undefined' !== typeof prg.nRetries) {
        tmp = J.isInt(prg.nRetries);
        cfg.nRetries = false === tmp ? prg.nRetries : tmp;
    }
    if ('undefined' !== typeof cfg.nRetries) {
        if ('number' !== typeof cfg.nRetries) {
            logger.error('option nRetries must be number or undefined. ' +
                         'Found: ' + cfg.nRetries);
            return;
        }
        // If numbers change, update text below.
        if (cfg.nRetries < 0 || cfg.nRetries > 10) {
            logger.error('option nRetries must be between 0 and 10. ' +
                         'Found: ' + cfg.nRetries);
            return;
        }
    }
    else {
        // If number changes update in program.
        cfg.nRetries = 0;
    }

    // Retry interval for request.
    if ('undefined' !== typeof prg.retryInterval) {
        tmp = J.isInt(prg.retryInterval);
        cfg.retryInterval = false === tmp ? prg.retryInterval : tmp;
    }
    if ('undefined' !== typeof cfg.retryInterval) {
        if ('number' !== typeof cfg.retryInterval) {
            logger.error('option retryInterval must be number or undefined. ' +
                         'Found: ' + cfg.retryInterval);
            return;
        }
        // If numbers change, update text below.
        if (cfg.retryInterval < 0 || cfg.retryInterval > 60000) {
            logger.error('option retryInterval must be between 0 and 60000. ' +
                         'Found: ' + cfg.retryInterval);
            return;
        }
    }
    else {
        // If number changes update in program.
        cfg.retryInterval = 10000;
    }

    // Throttle interval for request.
    if ('undefined' !== typeof prg.throttleInterval) {
        tmp = J.isInt(prg.throttleInterval);
        cfg.throttleInterval = false === tmp ? prg.throttleInterval : tmp;
    }
    if ('undefined' !== typeof cfg.throttleInterval) {
        if ('number' !== typeof cfg.throttleInterval) {
            logger.error('option throttleInterval must be number or ' +
                         'undefined. Found: ' + cfg.throttleInterval);
            return;
        }
        // If numbers change, update text below.
        if (cfg.throttleInterval < 0 || cfg.throttleInterval > 10000) {
            logger.error('option throttleInterval must be between ' +
                         '0 and 10000. Found: ' + cfg.throttleInterval);
            return;
        }
    }
    else {
        // If number changes update in program.
        cfg.throttleInterval = 500;
    }

    return cfg;
}

/**
 * ### Exports
 *
 *
 */
module.exports = function(program) {
    if (!config) {
        if ('string' === typeof program) {
            program = { config: program };
        }
        config = loadConfig(program.config);
        if (!config) return;
        config = checkConfig(program, config);
    }
    return config;
};


// ## Helper Functions.

function checkField(fields, name) {
    var f;
    f = fields[name];
    if (!f) return defaultFields[name];

    if ('string' !== typeof f) {
        logger.error('invalid field "' + name + '": ' + f);
        return false;
    }
    logger.info('custom field: ' + name + ' -> ' + f);
    return f;
}
