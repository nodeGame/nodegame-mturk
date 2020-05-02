"use strict";

// ## Bonus.

const J = require('JSUS').JSUS;
const fs = require('fs');
const path = require('path');

const logger = require('../core/logger')();
const cfg = require('../core/config')();
const api = require('../core/api');

var totNotifications, nNotified, errorsNotified;

function getFileSync(method, filePath) {
    let filePathOrig = filePath;
    // Load file.
    if (!path.isAbsolute(filePath)) {
        filePath = path.resolve(cfg.rootDir, filePath);
    }
    if (!fs.existsSync(filePath)) {
        logger.error(method + ' not found or not readable: ' + filePathOrig);
        return false;
    }
    return fs.readFileSync(filePath).toString();
}

/**
 * ### loadWorkerIdsFileSync
 *
 * Format:
 *
 * ```
 * [Subject]
 * This is the subject.
 * [Message]
 * This is the actual content.
 *```
 */
function loadWorkerIdsFileSync(filePath) {
    return getFileSync('fileWorkerIds', filePath).trim()
        .replace(/\r\n/g,'\n').split('\n');
}

/**
 * ### loadMessageFileSync
 *
 * Format:
 *
 * ```
 * [Subject]
 * This is the subject.
 * [Message]
 * This is the actual content.
 *```
 */
function loadMessageFileSync(filePath) {
    let file = getFileSync('fileMessage', filePath);

    // Start parsing.
    let tokens = file.split('[MessageText]');
    if (tokens.length === 1) {
        logger.error('bad format messageFile: [MessageText] not found');
        return false;
    }
    if (tokens.length > 2) {
        logger.error('bad format messageFile: multiple [MessageText] found');
        return false;
    }

    // Crete output object.
    let out = { MessageText: tokens[1] };

    tokens = tokens[0].split(['[Subject]']);
    if (tokens.length === 1) {
        logger.error('bad format messageFile: [Subject] not found');
        return false;
    }
    if (tokens.length > 2) {
        logger.error('bad format messageFile: multiple [Subject] found');
        return false;
    }
    out.Subject = tokens[1];
    return out;
}

/**
 * ### notify
 *
 *
 *
 */
function notify(args, cb) {
    var err, wids, subject, msg, params;
    args = args || {};

    subject = args.Subject;

    // Checking worker ids.
    wids = args.WorkerIds;
    if ('string' === typeof wids) wids = wids.split(',');

    if (!J.isArray(wids) || wids.length === 0) {
        err = 'worker ids for notification must be string or array. ' +
              'Found: ' + wids;

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

    // Checking subject of msg.
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

    // Checking content of msg.
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

    // console.log(params);

    api.req('NotifyWorkers', params,
        function(res) {
            let failures = res.NotifyWorkersFailureStatuses;
            let failed = '';
            if (failures.length) {
                for (let i = 0; i < failures.length; i++) {
                    if (failed) failed += ',';
                    errorsNotified.push(printDeliveryFailure(failures[i]));
                }
            }
            nNotified = totNotifications - failures.length;
            showStats();
            if (cb) cb();
        },
        function(err) {
            // errorsNotifications.push(err);
            if (cb) cb(err);
        }
    );
}

/**
 * ### printDeliveryFailure
 * ```
 * {
 *  NotifyWorkersFailureCode: 'HardFailure',
 *  NotifyWorkersFailureMessage: 'Cannot send a notification to a worker who has not done any work for you',
 *  WorkerId: 'A24XDLW7BOTZLH1'
 * }
 * ```
  */
function printDeliveryFailure(failure) {
    logger.warn('****************');
    logger.warn('Delivery Error: ' + failure.WorkerId);
    logger.warn('Reason:         ' + failure.NotifyWorkersFailureCode);
    logger.warn('Code:           ' + failure.NotifyWorkersFailureMessage);
    logger.warn('****************');
    return failure.WorkerId;
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
    logger.info('notifications: ' + totNotifications);
    logger.info('delivered:     ' + nNotified);
    if (errorsNotified.length) {
        logger.error('failed:       ' + errorsNotified.length);
        logger.error('failed ids:   ' + errorsNotified.join(', '));
    }
    console.log();

    if (cb) cb();
    return true;
}


module.exports = {
    notify: notify,
    loadMessageFileSync: loadMessageFileSync,
    loadWorkerIdsFileSync: loadWorkerIdsFileSync
};
