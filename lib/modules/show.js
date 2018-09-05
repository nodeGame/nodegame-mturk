"use strict";

// # Show.

var J = require('JSUS').JSUS;

var logger = require('../core/logger')();
var cfg = require('../core/config')();
var codes = require('../core/codes');

var balance = require('./balance');

var result = require('./result');
var bonus = require('./bonus');
var qualification = require('./qualification');

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
