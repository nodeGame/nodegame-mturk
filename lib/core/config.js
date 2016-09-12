"use strict";

// # Config.

var fs = require('fs-extra');
var J = require('JSUS').JSUS;
var path = require('path');

var logger = require('./logger')();

var config;

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
