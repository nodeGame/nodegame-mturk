"use strict";

// ## Get.

var J = require('JSUS').JSUS;

var logger = require('../core/logger')();
var cfg = require('../core/config')();

var api = require('../core/api');
var codes = require('../core/codes');

var show = require('./show');

/**
 * ### getRequesterStats
 *
 *
 *
 */
function getHITStatus(args, cb) {

    if (!api.get(true, cb)) return;

    getLastHIT(function(err, hit) {
        if (args && args.show) {
            logger.info('**** HIT Status **** ')
            logger.info('id:            ' + cfg.HITId);
            logger.info('status:        ' + hit.HITReviewStatus);
            logger.info('pending ass:   ' + hit.NumberOfAssignmentsPending);
            logger.info('available ass: ' + hit.NumberOfAssignmentsAvailable);
            logger.info('completed ass: ' + hit.NumberOfAssignmentsCompleted);
            logger.info('expiration:    ' + hit.Expiration);
            logger.info('annotation:    ' + hit.RequesterAnnotation);
        }
        if (cb) cb(hit);
    });

//    api.req('GetHIT', {
//        HITId: cfg.HITId
//    }, function(res) {
//        cb(res.HIT[0]);
//    }, function(err) {
//        cb(err);
//    });
}

/**
 * ### getQualificationType
 *
 *
 *
 */
function getQualificationType(args, cb) {

    if (!api.get(true, cb)) return;

    _getQualificationType(function(err, qualificationType) {
        var qt, qtid;
        if (err) {
            logger.error('an error occurred retrieving qualification type id');
            logger.error(err);
            if (cb) cb();
            return;
        }
        qtid = qualificationType.QualificationTypeId;

        cfg.QualificationTypeId = qtid;

        logger.info('retrieved QualificationTypeId: ' + qtid +
                   ' ("' + qualificationType.Name + '")');
        if (cb) cb();
    });
}


/**
 * ### getLastHITId
 *
 *
 *
 */
function getLastHITId(args, cb) {

    if (!api.get(true, cb)) return;

    getLastHIT(function(err, hit) {
        if (err) {
            logger.error('an error occurred retrieving last HIT id');
            logger.error(err);
            if (cb) cb();
            return;
        }
        cfg.HITId = hit.HITId;
        logger.info('retrieved last HIT id: ' + cfg.HITId + ' ("' +
                    hit.Title + '" | $' + hit.Reward + ')');
        if (cb) cb();
    });
}



// Not possible to search by title. Needs to get back all results,
// and then search amongst those.

function getLastHIT(cb) {
    // Properties: Title | Reward | Expiration | CreationTime | Enumeration
    // Sorting: Ascending | Descending

    api.req('ListHITs', {
        PageSize: 1,
        PageNumber: 1
    }, function(res) {
        cb(null, res.HITs[0]);
    }, function(err) {
        cb(err);
    });
}

// Not possible to search by title. Needs to get back all results,
// and then search amongst those.

function _getQualificationType(cb, query) {
    // Properties: Name
    // Sorting: Ascending | Descending

    api.req('ListQualificationTypes', {
        // SortProperty: 'Name',
        // SortDirection: 'Descending',
        PageSize: 1,
        PageNumber: 1,
        // Query: query,
        MustBeRequestable: true,
        MustBeOwnedByCaller: true
    }, function(res) {
        cb(null, res.QualificationTypes[0]);
    }, function(err) {
        cb(err);
    }); // QualificationTypeId:
}

/**
 * ## Exports
 *
 *
 *
 */
module.exports = {
    qualificationType: getQualificationType,
    lastHITId: getLastHITId,
    HITStatus: getHITStatus
};
