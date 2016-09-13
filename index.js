/**
 * # nodegame-mturk
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Handles standard operations with Amazon Mechanical Turk Server
 *
 * http://nodegame.org
 */

module.exports = function(program, logger) {
    var stuff;

    program = program || {};
    stuff = {};

    // Core.
    stuff.logger = require('./lib/core/logger')(program);
    stuff.config = require('./lib/core/config')(program);
    stuff.codes = require('./lib/core/codes');
    stuff.api = require('./lib/core/api');
    //stuff.logger = require('./lib/core/program');
    //stuff.logger = require('./lib/core/vorpal');


    // Modules.
    stuff.modules = {};
    stuff.modules.manageHIT = require('./lib/modules/manageHIT');
    stuff.modules.balance = require('./lib/modules/balance');
    stuff.modules.get = require('./lib/modules/get');
    stuff.modules.bonus = require('./lib/modules/bonus');
    stuff.modules.qualification = require('./lib/modules/qualification');
    stuff.modules.result = require('./lib/modules/result');
    stuff.modules.show = require('./lib/modules/show');

    return stuff;
};
