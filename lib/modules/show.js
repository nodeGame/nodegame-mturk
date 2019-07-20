"use strict";

// # Show.

const J = require('JSUS').JSUS;

const logger = require('../core/logger')();
const cfg = require('../core/config')();
const codes = require('../core/codes');

const balance = require('./balance');

const result = require('./result');
const bonus = require('./bonus');
const qualification = require('./qualification');

/**
 * ### showSummary
 *
 *
 *
 */
function showSummary(args, cb) {

    logger.info('**** Results ****');
    result.showStats();

    logger.info('**** Bonus ****');
    bonus.showStats();

    logger.info('**** Qualification ****');
    qualification.showStats();

    logger.info('**** Balance ****');
    balance.show({}, cb);

    return true;
}


/**
 * ### showFieldsNames
 *
 *
 *
 */
function showFieldsNames(args, cb) {
    var f;
    logger.info('**** Fields ****');
    for (f in cfg.fields) {
        if (cfg.fields.hasOwnProperty(f)) {
            logger.info(f + ' -> ' + cfg.fields[f]);
        }
    }
    return true;
}

/**
 * ## Exports
 *
 *
 *
 */
module.exports = {
    summary: showSummary,
    fields: showFieldsNames
};
