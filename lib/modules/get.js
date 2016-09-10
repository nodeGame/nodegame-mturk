"use strict";

// ## Get.

var J = require('JSUS').JSUS;

var logger = require('../core/logger')();
var cfg = require('../core/config')();

var api = require('../core/api');
var codes = require('./codes');

var show = require('./show');


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
        qt = qualificationType[0];
        qtid = qt.QualificationTypeId;

        cfg.QualificationTypeId = qtid;

        logger.info('retrieved QualificationTypeId: ' + qtid +
                   ' ("' + qt.Name + '")');
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

    getLastHIT(function(err, HIT) {
        if (err) {
            logger.error('an error occurred retrieving last HIT id');
            logger.error(err);
            if (cb) cb();
            return;
        }
        HIT = HIT.HIT[0];
        HITId = HIT.HITId;
        logger.info('retrieved last HIT id: ' + HITId + ' ("' +
                    HIT.Title + '")');
        if (cb) cb();
    });
}



// Not possible to search by title. Needs to get back all results,
// and then search amongst those.

function getLastHIT(cb) {
    // Properties: Title | Reward | Expiration | CreationTime | Enumeration
    // Sorting: Ascending | Descending

    api.req('SearchHITs', {
        SortProperty: 'CreationTime',
        SortDirection: 'Descending',
        PageSize: 1,
        PageNumber: 1
    }, function(res) {
        cb(null, res.SearchHITsResult[0]);
    }, function(err) {
        cb(err);
    });
}

// Not possible to search by title. Needs to get back all results,
// and then search amongst those.

function _getQualificationType(cb, query) {
    // Properties: Title | Reward | Expiration | CreationTime | Enumeration
    // Sorting: Ascending | Descending

    api.req('SearchQualificationTypes', {
        SortProperty: 'Name',
        SortDirection: 'Descending',
        PageSize: 1,
        PageNumber: 1,
        // Query: query,
        MustBeOwnedByCaller: true
    }, function(res) {
        cb(null, res.SearchQualificationTypesResult[0].QualificationType);
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
    lastHITId: getLastHITId
};
