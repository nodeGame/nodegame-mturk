"use strict";

var J = require('JSUS').JSUS;
var logger = require('./logger')();
var cfg = require('./config')();

var codes = require('./codes');
var req = require('./req');


/**
 * ### showUploadStats
 *
 *
 *
 */
function showUploadStats(args, cb) {
    var err;

    var totApproveExpected, totRejectExpected;
    var totBonusExpected;
    var totQualificationExpected;

    var nBonus, maxBonus, minBonus, meanBonus, stdDevBonus, sumSquaredBonus;
    var resultsDb, totResults;

    resultsDb = codes.getResultsDb(true, cb);
    if (!resultsDb) return;
    totResults = resultsDb.size();

    args = args || { all: true };

    logger.info('tot results: ' + totResults || 0);

    // Approve / Reject.
    if (args.all || args.result) {
        totApproveExpected = resultsDb.status.approve ?
            resultsDb.status.approve.size() : 0;
        totRejectExpected = resultsDb.status.reject ?
            resultsDb.status.reject.size() : 0;

        logger.info('to approve: ' + totApproveExpected);
        logger.info('to reject: ' + totRejectExpected);


        if ('number' !== typeof nProcessed) {
            logger.warn('results not yet uploaded to amt.');
            if (cb) cb();
            return true;
        }

        logger.info('results processed: ' + nProcessed + '/' + totResults);
        logger.info('approved: ' + nApproved);
        logger.info('rejected: ' + nRejected);

        if (errorsApproveReject && errorsApproveReject.length) {
            err = true;
            logger.error('approve/reject failed: ' +
                          errorsApproveReject.length);
        }
    }

    if (args.all || args.bonus) {
        totBonusExpected = 0;
        totApproveExpected = 0;
        totRejectExpected = 0;
        totQualificationExpected = 0;

        nBonus = 0, sumSquaredBonus = 0, stdDevBonus = 'NA';
        resultsDb.each(function(item) {
            var b;
            b = item[cfg.bonusField];
            if (b) {
                nBonus++;
                totBonusExpected += b;
                if ('undefined' === typeof maxBonus || b > maxBonus) {
                    maxBonus = b;
                }
                if ('undefined' === typeof minBonus || b < minBonus) {
                    minBonus = b;
                }
                sumSquaredBonus += Math.pow(b, 2);
            }
            if (item.Reject) totRejectExpected++;
            else if (item.Approve) totApproveExpected++;
            if (item.QualificationTypeId) totQualificationExpected++;
        });

        if (nBonus > 1 ) {
            stdDevBonus = (Math.pow(totBonusExpected, 2) / nBonus);
            stdDevBonus = sumSquaredBonus - stdDevBonus;
            stdDevBonus = Math.sqrt( stdDevBonus / (nBonus - 1) );
            meanBonus = (totBonusExpected / nBonus).toFixed(2);
        }
        else if (nBonus === 1) {
            meanBonus = maxBonus;
        }

        logger.info('results: ' + totResults || 0);
        logger.info('to approve: ' + totApproveExpected);
        logger.info('to reject: ' + totRejectExpected);
        logger.info('bonuses: ' + nBonus);
        if (nBonus > 0) {
            logger.info('bonuses tot: ' + totBonusExpected);
            if (nBonus > 1) {
                logger.info('bonuses mean: ' + meanBonus);
                logger.info('bonuses min: ' + minBonus);
                logger.info('bonuses max: ' + maxBonus);
                logger.info('bonuses stddev: ' + stdDevBonus);
            }
        }


        if ('number' !== typeof nProcessed) {
            logger.warn('results not yet uploaded to amt.');
            if (cb) cb();
            return true;
        }

        logger.info('results processed: ' + nProcessed + '/' + totResults);
        logger.info('approved: ' + nApproved);
        logger.info('rejected: ' + nRejected);
        logger.info('bonuses: ' + nBonusGiven +
                    ' (paid: ' + (totBonusPaid || 0) + ')');

        if (errorsApproveReject && errorsApproveReject.length) {
            err = true;
            logger.error('approve/reject failed: ' +
                         errorsApproveReject.length);
        }
        if (errorsBonus && errorsBonus.length) {
            err = true;
            logger.error('bonuses failed: ' + errorsBonus.length);
        }
    }

    if (args.all || args.qualification) {
        logger.info('qualifications: ' + totQualificationExpected);

        if ('number' !== typeof nProcessed) {
            logger.warn('results not yet uploaded to amt.');
            if (cb) cb();
            return true;
        }
        logger.info('qualifications given: ' + nQualificationGiven);
        if (errorsQualification && errorsQualification.length) {
            err = true;
            logger.error('qualifications failed: ' +
                          errorsQualification.length);
        }
    }

    if (err) {
    // logger.warn('type showErrors to have more details about the errors');
    }

    if (args.GetAccountBalance) {
        getAccountBalance({}, function(balance) {
            if ('undefined' !== typeof args.origAccountBalance) {
                logger.log('Original balance: ' +
                           args.origAccountBalance.FormattedPrice +
                           ' New balance: ' + balance.FormattedPrice +
                           ' (diff: ' +
                           args.origAccountBalance.Amount - balance.Amount +
                           ')');
                if (cb) cb();
            }
            else {
                showAvailableAccountBalance({}, cb);
            }
        });
    }
    else if (cb) cb();

    return true;
}



module.exports = {
    uploadStats: showUploadStats
};
