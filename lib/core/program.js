"use strict";

// # Program.

var version = require('../package.json').version;
var program = require('commander');

program
    .version(version)

     // Specify a configuration file (other inline-options are mixed-in.)
    .option('-C, --config <confFile>',
            'Specifies a configuration file')

    .option('-c, --connect',
            'Opens the connection with Mturk Server')

    .option('-L, --lastHITId',
            'Fetches the last HIT id by requester')

    .option('-r, --resultsFile <resultsFile>',
            'Path to a codes file with Exit and Access Codes')

    .option('-i, --inputCodesFile <inputCodesFile>',
            'Path to a codes file with Exit and Access Codes')

//    .option('-T, --hitTitle [hitTitle]',
//            'Uses the HITId of the first HIT with same title by requester')

    .option('-Q, --getQualificationTypeId',
            'Fetches the first qualification type owned by requester from AMT')

    .option('-H, --HITId [HITId]',
            'HIT id')

    .option('-t, --token [token]',
            'Unique token for one-time operations')

    .option('-s, --sandbox',
            'Activate sandbox mode')

    .option('-d, --dry',
            'Dry-run: does not actually send any request to server')

    .option('-q, --quiet',
            'No/minimal output printed to console');


/**
 * ## Exports
 *
 *
 *
 */
module.exports = program;
