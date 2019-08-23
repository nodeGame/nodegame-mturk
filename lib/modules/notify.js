"use strict";

// ## Bonus.

const J = require('JSUS').JSUS;

const logger = require('../core/logger')();
const cfg = require('../core/config')();
const api = require('../core/api');
const codes = require('../core/codes');


var totNotifications, nNotified, errorsNotified;


/**
 * ### grantBonus
 *
 *
 *
 */
function notify(args, cb) {
    var err, wids, subject, msg, params;
    args = args || {};

    subject = args.Subject;

    if ('undefined' === typeof subject) {
	err = 'missing Subject for notifications. First WorkerId: ' + wids[0];
    }
    else if ('string' !== typeof subject) {
        err = 'invalid Subject for notifications. First WorkerId: ' + wids[0] +
            '. Found: ' + subject;
    }
    if (!err && subject.length > 200) {
        err = 'Subject for notification is too long. Length (max=200): ' +
            subject.length;
    }
    if (err) {
        logger.error(err);
        if (cb) cb(err);
        return;
    }

    msg = args.MessageText;

    if ('undefined' === typeof msg) {
	err = 'missing MessageText for notifications with subject: ' + subject;
    }
    else if ('string' !== typeof msg) {
        err = 'invalid MessageText for notification with subject: ' + subject +
            '. Found: ' + msg;
    }
    if (!err && msg.length > 4096) {
        err = 'MessageText for notification with subject "' + subject +
            '" is too long. Length (max=4096): ' + msg.length;
    }
    
    wids = args.WorkerIds;
    
    if ('string' === typeof wids) wids = [wids];
    
    if (!J.isArray(wids) || wids.length === 0) {
        err = 'a string or an non-empty array of worker ids is required  for ' +
            'notifications. Found: ' + wids;
     
    }    
    if (!err && wids.length > 100) {
        err = 'too many recipients for notification with subject "' + subject +
            '". Found (max=100): ' + wids.length;
     
    }    
    if (err) {
        logger.error(err);
        if (cb) cb(err);
        return;
    }

    resetGlobals();

    totNotifications = wids.length;
    
    params = {
        WorkerIds: wids,
        Subject: subject,
        MessageText: msg
    };

    console.log(params);

    api.req('NotifyWorkers', params, function(res) {
        if (cb) cb();
    }, function (err) {
        // errorsNotifications.push(err);
        if (cb) cb(err);
    });
}

/**
 * ### resetGlobals
 *
 *
 *
 */
function resetGlobals() {
    totNotifications = 0;
    nNotified = 0;
    errorsNotified = [];
}

/**
 * ### showStats
 *
 *
 *
 */
function showStats(args, cb) {
    
    logger.info('tot notifications: ' + totNotifications);

    logger.info('sent:  ' + nNotified);
    logger.info('failed:   ' + errorsNotified.length);
    console.log();

    console.log();

    if (cb) cb();
    return true;
}


module.exports = {
    notify: notify
};
