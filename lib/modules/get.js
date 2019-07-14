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

const inquirer = require('inquirer');


/**
 * ### getHITStatus
 *
 * Returns the status of the HIT currently selected
 *
 * If the API is not connected it returns
 *
 * @param {object} args Configuration object
 * @param {function} cb Callback
 */
function getHITStatus(args, cb) {

    // Check if it is connected.
    if (!api.get(true, cb)) return;

    let hitId = cfg.HITId;
    if (!hitId) {
	let err = 'select an HIT first';
	logger.error(err);
	if (cb) cb(err);
	return;
    }
    
    api.req('GetHIT', {
	HITId: hitId 
    }, function(err, hit) {
	if (err) return;
	
        if (args && args.show) {
            logger.info('**** HIT Status **** ')
            logger.info('id:            ' + hitId);
            logger.info('status:        ' + hit.HITReviewStatus);
            logger.info('pending ass:   ' + hit.NumberOfAssignmentsPending);
            logger.info('available ass: ' + hit.NumberOfAssignmentsAvailable);
            logger.info('completed ass: ' + hit.NumberOfAssignmentsCompleted);
            logger.info('expiration:    ' + hit.Expiration);
            logger.info('annotation:    ' + hit.RequesterAnnotation);
        }
        if (cb) cb(null, hit);
    });
}

/**
 * ### getQualificationType
 *
 *
 *
 */
function getQualificationType(args, cb) {

    if (!api.get(true, cb)) return;

    _getQualificationTypes(function(err, qualificationTypes) {
        if (err) {
            logger.error('an error occurred retrieving qualification type id');
            logger.error(err);
            if (cb) cb();
            return;
        }
	set.QualificationType(qualificationTypes[0]);
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
	    message: 'Select a HIT',
	    choices: hits.map((hit, idx) => {
		let d = makeDate(hit.CreationTime) +
		    ' - ' + hit.HITId + ' ' + hit.Title +
		    ' ($' + hit.Reward + ')';
		hit.name = hit.Title;
		return {
		    name: d,
		    value: hit
		};
	    })
	    // Not working. Says obj obj after selection.
	    // , transformer: (hit) => hit.Title
	};
	
	inquirer
	    .prompt(questions)
	    .then(function(answers) {
		set.HIT(answers.HIT);
		if (cb) cb();
	    })
    });
}


function selectQualificationType(args, cb) {
    _getQualificationTypes((err, quals) => {
	// console.log(hits);
	if (err) {
	    if (cb) cb();
	    return;
	}
	// console.log(quals);
	let questions = {
	    type: 'rawlist',
	    name: 'QualificationType',
	    message: 'Select a QualificationType',
	    choices: quals.map((q, idx) => {
		let d = makeDate(q.CreationTime)+ ' ' + q.Name;
		return {
		    name: d,
		    value: q,
		    'short': 'ojojo' 
		};
	    })
	};
	
	inquirer
	    .prompt(questions)
	    .then(function(answers) {
		set.QualificationType(answers.QualificationType);
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

function _getQualificationTypes(cb, query) {
    api.req('ListQualificationTypes', {
        MustBeRequestable: true,
        MustBeOwnedByCaller: true
    }, function(res) {
	if (!res.QualificationTypes || !res.QualificationTypes.length) {
	    let err = 'no QualificationType found';
            logger.error(err);
            if (cb) cb(err);
            return;
        }
        cb(null, res.QualificationTypes);
    }, function(err) {
        cb(err);
    });
}

function getBonusList(args, cb) {
    var params;
    params = {
        PageSize: 1,
        PageNumber: 1,
	show: !!args.show
    };
    if (args.HITId && args.AssignmentId) {
        logger.error('cannot pass both HITId and ' +
		     'AssignmentId to get list of bonuses');
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
        logger.error('neither HITId nor AssignmentId found ' +
		     'to get list of bonuses');
        if (cb) cb();
        return;
    }
    console.log(params);
    api.req('ListBonusPayments', params, function(res) {
        if (params.show) {
            console.log();
            logger.info('**** Bonus Payments List **** ')
            console.log();

	    // Compute stats.
	    let totBonus = 0;
	    let workers = {};
	    let totWorkers = 0;
	    res.BonusPayments.forEach((b) => {
		let bonus = J.isNumber(b.BonusAmount);
		if (bonus === false) {
		    logger.warn('could not get bonus amount for worker: ' +
				b.WorkerId);
		    return;
		}
		totBonus += bonus;
		if (!workers[b.WorkerId]) {
		    totWorkers++;
		    workers[b.WorkerId] = true;
		}
	    });
	    if (res.BonusPayments.length) {
		console.log(res.BonusPayments);
		console.log();
		logger.info('Tot Bonus: ' + totBonus);
		logger.info('Tot Workers: ' + totWorkers);
	    }
	    else {
		console.log(' - None');
	    }
	    console.log();
	  
        }
        cb(null, res.BonusPayments);
    }, function(err) {
        cb(err);
    }); // QualificationTypeId:
}

// ## Helper functions.

function makeDate(d) {
    let d1 = new Date(0);
    d1.setUTCSeconds(d);
    d1 = d1.toLocaleDateString();
    return d1;
}

// ## Exports.

module.exports = {
    // TODO upper case.
    qualificationType: getQualificationType,
    lastHITId: getLastHITId,
    HITStatus: getHITStatus,
    bonusPayments: getBonusList,
    HITs: selectHITId,
    QualificationTypes: selectQualificationType
};
