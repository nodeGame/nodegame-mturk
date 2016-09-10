/**
 * ### getAccountBalance
 *
 *
 *
 */
function getAccountBalance(args, cb) {
    if (!checkAPIandDB(cb, { results: false })) return;
    shapi.req('GetAccountBalance', {}, function(res) {
        if (cb) cb(res.GetAccountBalanceResult[0].AvailableBalance);
    });
}

/**
 * ### showAvailableAccountBalance
 *
 *
 *
 */
function showAvailableAccountBalance(args, cb) {
    getAccountBalance({}, function(balance) {
        logger.info((args.text || 'Your balance is: ') +
                    balance.FormattedPrice);
        if (cb) cb();
    });
}
