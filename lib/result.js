/**
 * ### uploadResults
 *
 *
 *
 */
function uploadResults(args, cb) {
    var res, options;

    // Check API and DB.
    if (!checkAPIandDB(cb)) return;
    // Args.
    if (!prepareArgs('uploadResult', args, cb)) return;

    // Do bonus checkings.

    if (!args.doBonus) {
        if (args.Reason) {
            logger.error('--Reason is set, but --doBonus is not. Aborting.');
            if (cb) cb();
            return;
        }

        if (args.UniqueTokenRequest) {
            logger.error('--UniqueTokenRequest is set, but ' +
                         '--doBonus is not. Aborting.');
            if (cb) cb();
            return;
        }
    }
    else {
        res = prepareArgs('grantBonus', args, cb);
        if (!res) return;
    }

    // Do qualification checkings.

    if (!args.doQualification) {
        if (args.QualificationTypeId) {

            logger.error('--QualificationTypeId  is set, ' +
                         'but --doQualification is not. Aborting.');
            if (cb) cb();
            return;
        }
        if (args.IntegerValue) {

            logger.error('--IntegerValue  is set, ' +
                         'but --doQualification is not. Aborting.');
            if (cb) cb();
            return;
        }
        if (args.SendNotification) {

            logger.error('--SendNotification  is set, ' +
                         'but --doQualification is not. Aborting.');
            if (cb) cb();
            return;
        }
    }
    else {
        res = prepareArgs('assignQualification', args, cb);
        if (!res) return;
    }

    // All checkings done. Prepare global variables.

    resetGlobals('uploadResult');
    options = { 'uploadResult': true };

    if (args.doBonus) {
        resetGlobals('grantBonus');
        options.grantBonus = true;
    }
    if (args.doQualification) {
        resetGlobals('assignQualification');
        options.assignQualification = true;
    }

    getAccountBalance({}, function(balanceObj) {

        options.origAccountBalance = balanceObj;
        options.GetAccountBalance = true;

        // Do it!
        resultsDb.each(uploadResult, function(err) {
            if (++nProcessed >= totResults) {
                showUploadStats(options, cb);
            }
        }, args);
    });
    return true;
}

/**
 * ### uploadResult
 *
 *
 *
 */
function uploadResult(data, cb, args) {
    var id, wid, op, params, feedback;

    id = data.id;
    wid = data.WorkerId;

    if (data.Reject) {
        if (data[cfg.bonusField]) {
            logger.warn('Assignment rejected, but bonus found. WorkerId: ' +
                        wid);
        }
        op = 'Reject';
    }
    else {
        op = 'Approve';
    }

    params = { AssignmentId: data.AssignmentId };

    feedback = args.RequesterFeedback || data.RequesterFeedback;
    if (feedback) params.RequesterFeedback = feedback;

    shapi.req(op + 'Assignment', params, function() {
        // No bonus granting if assignment is rejected.
        if (op === 'Reject') {
            nRejected++;
        }
        else {
            nApproved++;

            if (args.bonus && data[cfg.bonusField]) {
                grantBonus(data, function() {
                    if (args.qualification && data.QualificationTypeId) {
                        assignQualification(data, cb);
                    }
                    else if (cb) cb();
                });
            }
            else if (args.qualification && data.QualificationTypeId) {
                assignQualification(data, cb);
            }
            else {
                if (cb) cb();
            }
        }
    }, function(err) {
        errorsApproveReject.push(err);
        if (cb) cb();
    });

    return true;
}
