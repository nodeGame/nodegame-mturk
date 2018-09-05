"use strict";

// ## Vorpal definitions.

var J = require('JSUS').JSUS;
var logger = require('./logger')();
var cfg = require('./config')();

var modules = require('./load-modules');
var api = require('./api');
var codes = require('./codes');

var vorpal = module.exports = require('vorpal')();

vorpal
    .command('connect')
    .action(function(args, cb) {
        api.connect(args, cb);
    });

vorpal
    .command('extendHIT', 'Extends the HIT.')
    .option('-a, --assignments [n]',
            'Adds n assigments to the HIT')
    .option('-t, --time [t]',
            'Adds extra t seconds to the HIT')
    .action(function(args, cb) {
        modules.manageHIT.extend(args, cb);
    });

vorpal
    .command('expireHIT', 'Expires the HIT')
    .action(function(args, cb) {
        modules.manageHIT.expire(args, cb);
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
        modules.result.upload(args.options, cb);
    });

vorpal
    .command('grantBonus',
             'Grants bonuses as specified in results codes')

    .option('-t, --UniqueRequestToken [token]',
            'Unique token for one-time operations')

    .option('-r --Reason [reason]',
            'Sets the reason for the bonus')

    .action(function(args, cb) {
        modules.bonus.grantAll(args.options, cb);
    });

vorpal
    .command('assignQualification',
             'Assigns a Qualification to all results codes')

    .option('-q --QualificationTypeId <id>',
            'Specify the ID of the qualification (overwrites previous values)')

    .option('-i --IntegerValue <value>',
            'Sets the integer value for the qualification (AMT default = 1)')

    .option('-n --SendNotification',
            'Sends a notification about qualification (AMT default = true')

    .action(function(args, cb) {
        modules.qualification.assignAll(args.options, cb);
    });

vorpal
    .command('get <what>', 'Fetches and stores the requested info')
    .autocomplete([
        'HITId', 'HITStatus', 'QualificationTypeId', 'AccountBalance'
    ])
    .action(function(args, cb) {

        if (args.what === 'HITId') {
            modules.get.lastHITId({}, cb);
        }
        else if (args.what === 'QualificationTypeId') {
            modules.get.qualificationType({}, cb);
        }

        else if (args.what === 'AccountBalance') {
            modules.balance.show({}, cb);
        }
        else if (args.what === 'HITStatus') {
            modules.get.HITStatus({ show: true }, function() { cb() });
        }
        else {
            logger.warn('unknown "get" argument: ' + args.what);
            cb();
        }
    });

vorpal
    .command('load <what> <path>', 'Loads a file')

    .autocomplete([ 'Results', 'InputCodes' ])

    .option('-r, --replace',
            'Replaces current database')

    .option('-a, --append',
            'Appends to current database')

    .option('-v, --validateLevel <level>',/^(0|1|2)$/i, '2')

//    .option('-f, --resultsFile [resultsFile]',
//            'Path to a codes file with Exit and Access Codes')


//     .option('-b, --bonusField [bonusField]',
//             'Overwrites the name of the bonus field (default: bonus)')
//
//     .option('-e, --exitCodeField [exitCodeField]',
//             'Overwrites the name of the exit code field ' +
//             '(default: ExitCode)')

    .action(function(args, cb) {
        if (args.what === 'Results') {
            args.options.resultsFile = args.path;
            codes.loadResults(args.options, cb);
        }
        else if (args.what === 'InputCodes') {
            args.options.inputCodesFile = args.path;
            codes.loadInputCodes(args.options, cb);
        }
    });

vorpal
    .command('show <what>', 'Prints out the requested info')

    .autocomplete(['Results', 'Summary', 'InputCodes', 'Config', 'Fields'])

    .option('-p, --position [position]', 'Position of result|input code in db')

    .action(function(args, cb) {
        var idx, config, inputCodesDb, resultsDb;

        if (args.what === 'Results') {
            resultsDb = codes.getResultsDb(true, cb);
            if (!resultsDb) return;
            idx = args.options.position || 0;
            this.log(resultsDb.get(idx));
            cb();
        }
        else if (args.what === 'InputCodes') {
            inputCodesDb = codes.getInputCodesDb(true, cb);
            if (!inputCodesDb) return;
            idx = args.options.position || 0;
            this.log(inputCodesDb.get(idx));
            cb();
        }

        else if (args.what === 'Summary') {
            modules.show.summary(args, cb);
        }

        else if (args.what === 'Config') {
            config = J.clone(cfg);
            resultsDb = codes.getResultsDb();
            config.nResults = resultsDb ? resultsDb.size() : 'NA';
            inputCodesDb = codes.getInputCodesDb();
            config.nInputCodes = inputCodesDb ? inputCodesDb.size() : 'NA';
            config.HITId = cfg.HITId || 'NA';
            config.QualificationTypeId = cfg.QualificationTypeId || 'NA';
            config.UniqueRequestToken = cfg.UniqueRequestToken || 'NA';
            config.api = api ? 'client created' : 'client **not** created';
            this.log(config);
            cb();
        }

        else if (args.what === 'Fields') {
            modules.show.fields(args, cb);
            cb();
        }

        else {
            logger.warn('unknown "show" argument: ' + args.what);
            cb();
        }
    });
