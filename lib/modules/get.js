"use strict";

// ## Get.

const J = require('JSUS').JSUS;
const logger = require('../core/logger')();

const cfg = require('../core/config')();
// TODO: merge cfg and set.
const set = require('../core/set');

const api = require('../core/api');
const codes = require('../core/codes');

const show = require('./show');


const colors = require('colors');
const inquirer = require('inquirer');


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

	set.HIT(hit);
	
        if (cb) cb();
    });
}


function getHITs(cb) {
    api.req('ListHITs', {}, function(res) {
	// console.log(res);
        if (!res.HITs || !res.HITs.length) {
	    let err = 'no HIT found';
            logger.error(err);
            if (cb) cb(err);
            return;
        }
        cb(null, res.HITs);
    }, function(err) {
        cb(err);
    });
}

function selectHITId(args, cb) {
    getHITs((err, hits) => {
	// console.log(hits);
	if (err) {
	    if (cb) cb();
	    return;
	}
	let questions = {
	    type: 'rawlist',
	    name: 'HIT',
	    message: 'Select an HIT',
	    choices: hits.map((hit, idx) => {
		let d = new Date(0);
		d.setUTCSeconds(hit.CreationTime);
		d = d.toLocaleDateString() +
		    ' - ' + hit.Title + ' ($' + hit.Reward + ')';
		hit.name = hit.Title;
		return {
		    name: d,
		    value: hit
		};
	    })
	};
	
	inquirer
	    .prompt(questions)
	    .then(function(answers) {
		set.HIT(answers.HIT);
		if (cb) cb();
	    })
    });
}


// Not possible to search by title. Needs to get back all results,
// and then search amongst those.

function getLastHIT(cb) {

    getHITs(function(err, hits) {
        if (err) {
            if (cb) cb();
            return;
        }
        let lastHIT = hits[0];
        hits.forEach((hit) => {
            // console.log(hit.Title, hit.CreationTime);
            if (hit.CreationTime > lastHIT.CreationTime) {
                lastHIT = hit;
                // console.log('LAST!');
            }
        });
        cb(null, lastHIT);
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


function getBonusList(args, cb) {
    var params;
    params = {
        PageSize: 1,
        PageNumber: 1,
    };
    if (args.HITId && args.AssignmentId) {
        logger.error('cannot pass both HITId and AssignmentId to get list of bonuses');
        if (cb) cb();
        return;
    }
    if (args.HITId) {
        params.HITId = args.HITId;
    }
    else if (args.AssignmentId) {
        params.AssignmentId = args.AssignmentId;
    }
    else if (cfg.HITId) {
        params.HITId = cfg.HITId;
    }
    else {
        logger.error('neither HITId nor AssignmentId found to get list of bonuses');
        if (cb) cb();
        return;
    }
    // console.log(params);
    api.req('ListBonusPayments', params, function(res) {
        if (params.show) {
            console.log();
            logger.info('**** Bonus Payments **** ')
            console.log();
            console.log(res.BonusPayments);
            console.log();
        }
        cb(null, res.BonusPayments);
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
    HITStatus: getHITStatus,
    bonusPayments: getBonusList,
    HITs: selectHITId
};
