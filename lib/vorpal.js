"use strict";

// ## Vorpal definitions.

var J = require('JSUS').JSUS;
var logger = require('./logger')();
var cfg = require('./config')();

var stuff = module.parent.exports.stuff;

var vorpal = module.exports = require('vorpal')();

vorpal
    .command('connect')
    .action(function(args, cb) {
        stuff.connect(args, cb);
    });

vorpal
    .command('extendHIT', 'Extends the HIT.')
    .option('-a, --assignments [n]',
            'Adds n assigments to the HIT')
    .option('-t, --time [t]',
            'Adds extra t seconds to the HIT')
    .action(function(args, cb) {
        stuff.manageHIT.extendHIT(args, cb);
    });

vorpal
    .command('expireHIT', 'Expires the HIT')
    .action(function(args, cb) {
        stuff.manageHIT.expireHIT(args, cb);
    });

vorpal
    .command('loadResults', 'Loads a results file')

    .option('-r, --replace [resultsFile]',
            'Replaces current database')

    .option('-a, --append [resultsFile]',
            'Appends to current database')

    .option('-f, --resultsFile [resultsFile]',
            'Path to a codes file with Exit and Access Codes')

    .option('-v, --validateLevel <level>',/^(0|1|2)$/i, '2')

    .action(function(args, cb) {
        stuff.codes.loadResults(args.options, cb);
    });


vorpal
    .command('loadInputCodes', 'Loads an input codes file')

    .option('-r, --replace [resultsFile]',
            'Replaces current database')

    .option('-a, --append [resultsFile]',
            'Appends to current database')

    .option('-f, --inputCodesFile [inputCodesFile]',
            'Path to a codes file with Exit and Access Codes')

    .option('-v, --validateLevel <level>',/^(0|1|2)$/i, '2')

    .option('-b, --bonusField [bonusField]',
            'Overwrites the name of the bonus field (default: bonus)')

    .option('-e, --exitCodeField [exitCodeField]',
            'Overwrites the name of the exit code field ' +
            '(default: ExitCode)')

    .action(function(args, cb) {
        loadInputCodes(args.options, cb);
    });

vorpal
    .command('uploadResults',
             'Uploads the results to AMT server (approval+bonus+qualification)')

    .option('-f, --RequesterFeedback <feedback>',
            'Optional requester feedback for the worker')

    .option('-q, --doQualification',
            'Also assign the qualification, if specified or found')

    .option('-Q, --QualificationTypeId',
            'Sets the qualification type id (overwrites previous values)')

    .option('-i, --IntegerValue',
            'Sets the integer value for the qualification (AMT default = 1)')

    .option('-n --SendNotification',
            'Sends a notification about qualification (AMT default = true')

    .option('-b, --doBonus', 'Also grant bonus, if found')

    .option('-t, --UniqueRequestToken [token]',
            'Unique token for one-time operations')

    .option('-r --Reason [reason]',
            'Sets the reason for the bonus')

    .action(function(args, cb) {
        uploadResults(args.options, cb);
    });

vorpal
    .command('grantBonus',
             'Grants bonuses as specified in results codes')

    .option('-t, --UniqueRequestToken [token]',
            'Unique token for one-time operations')

    .option('-r --Reason [reason]',
            'Sets the reason for the bonus')

    .action(function(args, cb) {
        grantAllBonuses(args.options, cb);
    });

vorpal
    .command('assignQualification',
             'Assigns a Qualification to all results codes')

    .option('-q --QualificationTypeId',
            'Specify the ID of the qualification (overwrites previous values)')

    .option('-i --IntegerValue [value]',
            'Sets the integer value for the qualification (AMT default = 1)')

    .option('-n --SendNotification',
            'Sends a notification about qualification (AMT default = true')

    .action(function(args, cb) {
        assignAllQualifications(args.options, cb);
    });

vorpal
    .command('get <what>', 'Fetches and stores the requested info')
    .autocomplete([ 'HITId', 'QualificationTypeId', 'AccountBalance' ])
    .action(function(args, cb) {
        if (args.what === 'HITId') {
            getLastHITId({}, cb);
        }
        else if (args.what === 'QualificationTypeId') {
            getQualificationType({}, cb);
        }

        else if (args.what === 'AccountBalance') {
            showAvailableAccountBalance({}, cb);
        }
        else {
            logger.warn('unknown "get" argument: ' + args.what);
            cb();
        }
    });

vorpal
    .command('show <what>', 'Prints out the requested info')

    .autocomplete(['Results', 'UploadStats', 'InputCodes', 'Config'])

    .option('-p, --position [position]', 'Position of result|input code in db')

    .action(function(args, cb) {
        var idx, config;

        if (args.what === 'Results') {
            if (!resultsDb || !resultsDb.size()) {
                logger.error('no results to show.');
            }
            else {
                idx = args.options.position || 0;
                this.log(resultsDb.get(idx));
            }
        }
        else if (args.what === 'InputCodes') {
            if (!inputCodesDb || !inputCodesDb.size()) {
                logger.error('no input codes to show.');
            }
            else {
                idx = args.options.position || 0;
                this.log(inputCodesDb.get(idx));
            }
        }

        else if (args.what === 'UploadStats') {
            showUploadStats();
        }

        else if (args.what === 'Config') {
            config = J.clone(cfg);
            config.resultsFile = resultsFile;
            config.inputCodesFile = inputCodesFile;
            config.nResults = resultsDb ? resultsDb.size() : 'NA';
            config.nInputCodes = inputCodesDb ? inputCodesDb.size() : 'NA';
            config.HITId = HITId || 'NA';
            config.QualificationTypeId = cfg.QualificationTypeId || 'NA';
            config.token = cfg.token || 'NA';
            config.api = api ? 'client created' : 'client **not** created';
            this.log(config);
        }
        else {
            logger.warn('unknown "show" argument: ' + args.what);
        }
        cb();
    });
