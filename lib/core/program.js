"use strict";

// # Program.

var version = require('../../package.json').version;
var program = require('commander');

program
    .version(version)

     // Specify a configuration file (other inline-options are mixed-in.)
    .option('-C, --config <confFile>',
            'Specifies a configuration file')

    .option('-c, --connect',
            'Opens the connection with Mturk Server')

    .option('-r, --resultsFile <resultsFile>',
            'Path to a codes file with Exit and Access Codes')

    .option('-i, --inputCodesFile <inputCodesFile>',
            'Path to a codes file with Exit and Access Codes')

//    .option('-T, --hitTitle [hitTitle]',
//            'Uses the HITId of the first HIT with same title by requester')

    .option('-Q, --getQualificationTypeId',
            'Fetches the first qualification type owned by requester from AMT')

    .option('-H, --getLastHITId',
            'Fetches the id of the latest HIT')

    .option('-t, --token [token]',
            'Unique token for one-time operations')

    .option('-s, --sandbox',
            'Activate sandbox mode')

    .option('-d, --dry',
            'Dry-run: does not actually send any request to server')

    .option('-n, --nRetries <nRetries>',
            'How many times a request is repeated in case of error (Def: 0)')

    .option('-l, --retryInterval <rInterval>',
            'Milliseconds to wait before a request is repeated (Def: 10000)')

    .option('-o, --throttleInterval <tInterval>',
            'Milliseconds between two consecutive requests (Def: 500)')

    .option('-q, --quiet',
            'No/minimal output printed to console');


/**
 * ## Exports
 *
 *
 *
 */
module.exports = program;
