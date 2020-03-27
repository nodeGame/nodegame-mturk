"use strict";

// ## Create HIT.

const path = require('path');
const fs = require('fs');

// await not working? Weird.
// const fsPromises = fs.promises;

const J = require('JSUS').JSUS;

const logger = require('../core/logger')();
const cfg = require('../core/config')();
const api = require('../core/api');
const codes = require('../core/codes');

const balance = require('./balance');

const questionTemplatesDir = path.resolve(__dirname, '..', '..', 'templates');


// Requests tokens already used.
let requestTokens = {};
let totHITCreated, totHITFailed;

// Make sure that even in programmatic modes, everything is initialized.
resetGlobals();

const defaultHITParams = {

    // REQ means required.

    // Title. REQ.
    Title: null,

    // Description. REQ.
    Description: null,

    // REQ. Constraints: Either a Question parameter or a HITLayoutId
    // parameter must be provided.

    // The data the person completing the HIT uses to produce the results
    // The XML question data must not be larger than 64 kilobytes.
    Question: 'HTMLQuestion',

    // Use an old HIT as layout with placeholders.
    // HITLayoutId: String,

    // Placeholders for layout.
    // Note: Type: HITLayoutParameterList
    // HITLayoutParameters: HITLayoutParameterList,

    // USD reward. REQ. (Note: String)
    Reward: null,

    // The amount of time, in seconds, that a Worker has to
    // complete the HIT after accepting it. REQ.
    AssignmentDurationInSeconds: 60*60*2,

    // An amount of time, in seconds, after which the HIT is no
    // longer available for users to accept. REQ.
    LifetimeInSeconds: 60*60*24,

    // One or more words or phrases that describe the HIT,
    // separated by commas. REQ.
    Keywords: "experiment,survey,opinion,research",

    // The number of times the HIT can be accepted and completed
    // before the HIT becomes unavailable. REQ.
    MaxAssignments: null,

    // The number of seconds after an assignment for the HIT has
    // been submitted, after which the assignment is considered
    // Approved automatically unless the Requester explicitly rejects it.
    AutoApprovalDelayInSeconds: 60*60*24*7,

    // A condition that a Worker's Qualifications must meet before the
    // Worker is allowed to accept and complete the HIT. REQ.
    // QualificationRequirements: QualificationRequirementList,

    // The Assignment-level Review Policy applies to the assignments
    // under the HIT. You can specify for Mechanical Turk to
    // take various actions based on the policy.
    // Type: ReviewPolicy
    // AssignmentReviewPolicy: null,

    // The HIT-level Review Policy applies to the HIT. You can specify
    // for Mechanical Turk to take various actions based on the policy.
    // Type: ReviewPolicy
    // HITReviewPolicy: ReviewPolicy,

    // An arbitrary data field only visible to requester.
    // RequesterAnnotation: "",

    // A unique identifier for this request. Allows you to retry
    // the call on error without creating duplicate HITs.
    // Type: string.
    // The unique token expires after 24 hours.
    // UniqueRequestToken: "1234"
};

/**
* ### createHIT
*
*/
function createHIT(args, cb) {
    let res = api.get(true, cb);
    if (!res) return;

    console.log(args);

    // Check args. TODO: allow for HITLayoutId.
    if (!prepareArgs(args, cb)) return;

    let params = J.merge(defaultHITParams, args);


    let questionFilepath = path.join(questionTemplatesDir, params.Question);

    console.log('AAAA ' + questionFilepath);


    if (!fs.existsSync(questionFilepath)) {
        logger.error('--createHIT question template file not found: ' +
        params.Question);
        if (cb) cb();
        return false;
    }

    console.log(params);

    // Load the template.
    try {
        params.Question = fs.readFileSync(questionFilepath, 'utf8');
    }
    catch(e) {
        logger.error('--createHIT error occurred loading question template: ' +
        params.Question);
        if (cb) cb();
        return false;
    }

    // Add a unique request token.
    if ('undefined' === typeof params.UniqueRequestToken) {
        params.UniqueRequestToken = getRandomRequestToken();
    }
    console.log(params);

    // GO!
    api.req('createHIT', params, function(res) {
        if (cb) cb();
    }, function (err) {
        // errorsNotifications.push(err);
        if (cb) cb(err);
    });
    return true;
}

function prepareArgs(args, cb) {
    // Title, Description and Keywords.
    if (!checkStr(args, 'Title', cb)) return;
    if (!checkStr(args, 'Description', cb)) return;
    if (args.Keywords && !checkStr(args, 'Keywords', cb)) return;
    // Question. TODO: better checking here?
    if (args.Question && !checkStr(args, 'Question', cb)) return;
    // Reward.
    if (!args.Reward) args.Reward = '0';
    else if (!checkPosNum(args, 'Reward', cb)) return;
    // Time and Num Assignments.
    let tmp = 'AssignmentDurationInSeconds';
    if (args[tmp] && !checkPosNum(args, tmp, cb)) return;
    tmp = 'LifetimeInSeconds';
    if (args[tmp] && !checkPosNum(args, tmp, cb)) return;
    if (!checkPosNum(args, 'MaxAssignments', cb)) return;
    tmp = 'AutoApprovalDelayInSeconds';
    if (args[tmp] && !checkPosNum(args, tmp, cb)) return;
    // Token.
    tmp = 'UniqueRequestToken';
    if (args[tmp] && !checkPosNum(args, tmp, cb)) return;
    return true;
}

// Helper functions.

function checkStr(obj, name, cb) {
    let str = obj[name];
    if ('string' !== typeof str || str.trim() === '') {
        logger.error('--' + name + ' must be a non-empty string. Found: ' +
        str);
        if (cb) cb();
        return false;
    }
    return true;
}

function checkPosNum(obj, name, cb) {
    let num = obj[name];
    if (false === J.isNumber(num, 0, undefined, true)) {
        logger.error('--' + name + ' must be a non-negative number. Found: ' +
        num);
        if (cb) cb();
        return false;
    }
    return true;
}

function getRandomRequestToken() {
    let token = J.randomInt(10000000);
    // If we are unlucky, we start a while loop.
    if (requestTokens[token])
    while (requestTokens[token]) {
        token = J.randomInt(10000000);
    }
    // Store the token and return it.
    requestTokens[token] = true;
    return token;
}


function resetGlobals() {
    totHITFailed = 0;
    totHITCreated = 0;
}

/**
 * ### showStats
 *
 */
function showStats(args, cb) {
    logger.info('HITs created: ' + totHITCreated);
    if (totHITFailed) logger.info('HITs creation failures: ' + totHITFailed);
    if (cb) cb();
    return true;
}

// Exports.

module.exports = {
    createHIT: createHIT
};
