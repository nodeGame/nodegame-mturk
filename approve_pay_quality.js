var fs = require('fs');
var csv = require('ya-csv');
var mturk = require('mturk-api');
var _ = require('underscore');
var program = require('commander');
var winston = require('winston');
var NDDB = require('NDDB').NDDB;

var version = require('./package.json').version;

var config = require('./conf/mturk.conf.js');

var UNIQUE_TOKEN = '' + 3000;

var file, uniqueToken;

var codes;
codes = new NDDB();
codes.index('id', function(i) { return i.id });

// Commander.

program
    .version(version)

// Specify a configuration file (other inline-options will be ignored).

    .option('-C, --config [confFile]',
            'Specifies a configuration file to load')
    .option('-t, --token [token]',
            'Unique token for one-time operations')
    .option('-c, --codes [codesFile]',
            'Path to a codes file with Exit and Access Codes')
    .option('-f, --file [resultsFile]',
            'Path to a results file')
    .option('-q, --quiet',
            'No/minimal output printed to console')


// Parsing input parameters.
program.parse(process.argv);

logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            level: program.quiet ? 'error' : 'silly'
        }),
    ]
});


if (!program.file) {

    logger.error('no results file provided.');
    return;

}
file = program.file;

if (!fs.existsSync(file)) {
    logger.error('results file not found: ' + file);
    return;

}

logger.info('processing results file: ' + file);

uniqueToken = program.token;

if (!uniqueToken) {
    uniqueToken = UNIQUE_TOKEN;
    logger.info('unique token: ' + uniqueToken + ' (default)');
}
else {
    logger.info('unique token: ' + uniqueToken);
}

if (program.codes) {
    if (!fs.existsSync(program.codes)) {
        logger.error('codes file not found: ' + program.codes);
        return;
    }
    codes.loadSync(program.codes);
    logger.info('codes found: ' + codes.size());
}

logger.info('creating mturk client');

return;


function validateResult(result) {
    if (result.bonus < 0 || result.bonus > 10) {
        winston.error('wrong bonus: ' + result.bonus + '. WorkerIDd: ' +
                      result.WorkerId);
        return false;
    }

    return true;
}

mturk.createClient(config).then(function(api) {
    var params;
    var checkIt;
    var reader;

    reader = csv.createCsvFileReader(file, { columnsFromHeader: true });

    reader.addListener('data', function(data) {
        var code, wid;
        wid = data.WorkerId;
        // We must validate WorkerId and Exit Code (if found in codes file).
        if (codes) {
            code = codes.id.get(wid);
            if (!code) {
                logger.error('WorkerId not found in codes db: ' + wid);
                return;
            }
            if (code.ExitCode && (data.ExitCode !== code.ExitCode)) {
                logger.error('ExitCodes do not match. WorkerId: ' + wid +
                             '. ExitCode: ' + data.ExitCode ' (found) vs ' +
                             code.ExitCode ' (expected)');
            }
        }

        // Custom validation.
        if ('function' === typeof validateResult && !validateResult(data)) {
            return;
        }

        if (data.Approve) {
            // Approve... TODO
        }
    });

    checkIt = function(errOrRes) {
        logger.log(errOrRes);
    };

    //     api.req('GetAccountBalance').then(function(res) {
    //         console.log(res.GetAccountBalanceResult);
    //         //Do something
    //     }).catch(console.error);


    //     api
    //         .req('GetAssignmentsForHIT', {
    //             HITId: HIT_ID,
    //             // UniqueRequestToken: UNIQUE_TOKEN
    //         })
    //         .then(checkIt)
    //         .catch(checkIt);


    //     api
    //         .req('ExtendHIT', {
    //             HITId: HIT_ID,
    //             // MaxAssignmentsIncrement: 10,
    //             ExpirationIncrementInSeconds: 300,
    //             // UniqueRequestToken: UNIQUE_TOKEN
    //         })
    //         .then(checkIt)
    //         .catch(checkIt);

    //      api
    //          .req('ForceExpireHIT', { HITId: HIT_ID })
    //          .then(checkIt)
    //          .catch(checkIt);


    //     api
    //         .req('GrantBonus',
    //              { WorkerId: WID,
    //                AssignmentId: '304SM51WA4IV6E2Q5TD7X4BQ5AIBSI',
    //                BonusAmount: {
    //                    Amount: 1,
    //                    CurrencyCode: 'USD',
    //                    // FormattedPrice: 'USD 1'
    //                },
    //                Reason: 'Good Boy',
    //                UniqueRequestToken: '123'
    //              })
    //         .then(checkIt)
    //         .catch(checkIt);

    //     params = {
    //         Name: 'My Artex',
    //         Description: 'You cannot do it twice!',
    //         QualificationTypeStatus: 'Active'
    //     };
    //
    //     api
    //         .req('CreateQualificationType', params)
    //         .then(checkIt)
    //         .catch(checkIt);

    //     params = {
    //         QualificationTypeId: QID,
    //         WorkerId: WID
    //     };
    //     api.req('AssignQualification', params).then(function(res) {
    //         console.log(res);
    //
    //     }).catch(function(err) {
    //         console.log(err);
    //     });




    //     fs.readFile('./mturklinkpage.html', 'utf8',
    // function(err, unescapedXML) {
    //         if (err) {
    //             console.error(err);
    //             return;
    //         }
    ////IMPORTANT: XML NEEDS TO BE ESCAPED!
    //         //HIT options
    //         var params = {
    //             Title: "Create HIT Example",
    //             Description: "An example of how to create a HIT",
    //             Question: _.escape(unescapedXML),
    //             AssignmentDurationInSeconds: 180, // Allow 3 minutes toanswer
    //             AutoApprovalDelayInSeconds: 86400 * 1, // 1 day auto approve
    //             MaxAssignments: 100, // 100 worker responses
    //             LifetimeInSeconds: 86400 * 3, // Expire in 3 days
    //             Reward: {CurrencyCode:'USD', Amount:0.50}
    //         };
    //         api.req('CreateHIT', params).then(function(res) {
    //             //DO SOMETHING
    //         }).catch(function(err) {
    //             console.error(err);
    //         });
    //
    //     });



    //     //Example operation, with params
    //     api.req('SearchHITs', { PageSize: 100 }).then(function(res){
    //         //Do something
    //     }).catch(console.error)
    //
    //
    //         //MTurk limits the velocity of requests. Normally,
    //         //if you exceed their request rate-limit, you will receive a
    //         //'503 Service Unavailable' response. As of v2.0, our interface
    //         //automatically throttles your requests to 3 per second.
    //         for(var i=0; i < 20; i++){
    //             //These requests will be queued and
    // //  executed at a rate of 3 per second
    //             api.req('SearchHITs', { PageNumber: i }).then(function(res){
    //                 //Do something
    //             }).catch(console.error);
    //         }


}).catch(console.error);
