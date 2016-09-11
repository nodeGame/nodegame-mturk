"use strict";

// # Show.

var J = require('JSUS').JSUS;

var logger = require('../core/logger')();
var cfg = require('../core/config')();

var codes = require('./codes');
var balance = require('./balance');

var result = require('./result');
var bonus = require('./bonus');
var qualification = require('./qualification');

/**
 * ### showUploadStats
 *
 *
 *
 */
function showUploadStats(args, cb) {

    logger.info('**** Results ****');
    result.showStats();

    logger.info('**** Bonus ****');
    bonus.showStats();

    logger.info('**** Qualification ****');
    qualification.showStats();

    logger.info('**** Balance ****');
    balance.show();

    return true;
}

/**
 * ## Exports
 *
 *
 *
 */
module.exports = {
    uploadStats: showUploadStats
};
