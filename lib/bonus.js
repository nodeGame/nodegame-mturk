/**
 * ### grantAllBonuses
 *
 *
 *
 */
function grantAllBonuses(args, cb) {
    // Check API and DB.
    if (!checkAPIandDB(cb)) return;
    // Check args.
    if (!prepareArgs('grantBonus', args, cb)) return;

    nBonusGiven = 0;
    totBonusPaid = 0;
    bonusProcessed = 0;
    errorsBonus = [];

    resultsDb.each(grantBonus, function(err) {
        if (++bonusProcessed >= totResults) {
            showUploadStats({ bonus: true }, cb);
        }
    }, args);

    return true;
}

/**
 * ### grantBonus
 *
 *
 *
 */
function grantBonus(data, cb, args) {
    var params, reason, uniqueToken, err;
    args = args || {};

    reason = args.Reason || data.Reason;
    if ('string' !== typeof reason) {
        err = 'invalid or missing Reason for WorkerId: ' + data.WorkerId +
            '. Found: ' + reason;
        logger.error(err);
        if (cb) cb(err);
        return;
    }

    params = {
        WorkerId: data.WorkerId,
        AssignmentId: data.AssignmentId,
        BonusAmount: {
            Amount: data[cfg.bonusField],
            CurrencyCode: 'USD'
        },
        Reason: reason
    };

    uniqueToken = args.UniqueRequestToken || data.UniqueRequestToken;

    if (uniqueToken) params.UniqueRequestToken = uniqueToken;

    shapi.req('GrantBonus', params, function(res) {
        nBonusGiven++;
        totBonusPaid += data[cfg.bonusField];
        if (cb) cb();
    }, function (err) {
        errorsBonus.push(err);
        if (cb) cb(err);
    });
}
