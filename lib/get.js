// ## Helper functions that require an API connection.

// GET methods.


"use strict";

/**
 * ### getQualificationType
 *
 *
 *
 */
function getQualificationType(args, cb) {
    if (!api || !shapi) {
        logger.error('api not available. connect first');
        if (cb) cb();
        return;
    }
    shapi.getQualificationType(function(err, qualificationType) {
        if (err) {
            logger.error('an error occurred retrieving qualification type id');
            logger.error(err);
            if (cb) cb();
            return;
        }
        QualificationType = qualificationType[0];
        QualificationTypeId = QualificationType.QualificationTypeId;

        cfg.QualificationTypeId = QualificationTypeId;

        logger.info('retrieved QualificationTypeId: ' + QualificationTypeId +
                   ' ("' + QualificationType.Name + '")');
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
    if (!api || !shapi) {
        logger.error('api not available. connect first');
        if (cb) cb();
        return;
    }
    shapi.getLastHIT(function(err, HIT) {
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
