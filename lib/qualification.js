var J = require('JSUS').JSUS;
var logger = require('./logger')();
var cfg = require('./config')();

var codes = require('./codes');

/**
 * ### assignAllQualifications
 *
 *
 *
 */
function assignAllQualifications(args, cb) {
    var res, that, resultsDb;

    resultsDb = codes.getResultsDb(true, cb);
    if (!resultsDb) return;

    res = prepareArgs('assignQualification', args, cb);
    if (!res) return;

// if (nQualificationGiven || errorsQualification){
//     that = this;
//     return this.prompt({
//         type: 'confirm',
//         name: 'continue',
//     default: false,
//       message: 'That sounds like a really bad idea. Continue?',
//     }, function(result){
//       if (!result.continue) {
//         self.log('Good move.');
//         cb();
//       } else {
//         self.log('Time to dust off that resume.');
//         app.destroyDatabase(cb);
//       }
//     });
//   });
// }

    resetGlobals('assignQualification');

    // Do it!
    resultsDb.each(assignQualification, function(err) {
        if (++nProcessed >= totResults) {
            showUploadStats({ qualification: true }, cb);
        }
    }, args);

    return true;
}

/**
 * ### assignQualification
 *
 *
 *
 */
function assignQualification(data, cb, args) {
    var qid, params, err;
    args = args || {};

    // Qualification.
    qid = args.QualificationTypeId || data.QualificationTypeId;

    if (!qid) {
        err = 'no QualificationTypeId found. WorkerId: ' + data.WorkerId;
        logger.error(err);
        if (cb) cb(err);
        return;
    }

    params = {
        WorkerId: data.WorkerId,
        QualificationTypeId: qid
    };

    if ('number' === typeof args.IntegerValue) {
        params.IntegerValue = args.IntegerValue;
    }
    else {
        params.IntegerValue = data.IntegerValue;
    }

    if ('undefined' !== typeof args.SendNotification) {
        params.SendNotification = args.SendNotification;
    }
    else if ('undefined' !== typeof data.SendNotification) {
        params.SendNotification = data.SendNotification;
    }

    shapi.req('AssignQualification', params, function(res) {
        nQualificationGiven++;
        if (cb) cb();
    }, function (err) {
        errorsQualification.push(err);
        if (cb) cb(err);
    });

    return true;
}

/**
 * ### assignAllQualifications
 *
 *
 *
 */
function assignAllQualifications(args, cb) {
    var res, that;

    // Check API and DB.
    if (!checkAPIandDB(cb)) return;

    res = prepareArgs('assignQualification', args, cb);
    if (!res) return;

// if (nQualificationGiven || errorsQualification){
//     that = this;
//     return this.prompt({
//         type: 'confirm',
//         name: 'continue',
//     default: false,
//       message: 'That sounds like a really bad idea. Continue?',
//     }, function(result){
//       if (!result.continue) {
//         self.log('Good move.');
//         cb();
//       } else {
//         self.log('Time to dust off that resume.');
//         app.destroyDatabase(cb);
//       }
//     });
//   });
// }

    resetGlobals('assignQualification');

    // Do it!
    resultsDb.each(assignQualification, function(err) {
        if (++nProcessed >= totResults) {
            showUploadStats({ qualification: true }, cb);
        }
    }, args);

    return true;
}

/**
 * ### assignQualification
 *
 *
 *
 */
function assignQualification(data, cb, args) {
    var qid, params, err;
    args = args || {};

    // Qualification.
    qid = args.QualificationTypeId || data.QualificationTypeId;

    if (!qid) {
        err = 'no QualificationTypeId found. WorkerId: ' + data.WorkerId;
        logger.error(err);
        if (cb) cb(err);
        return;
    }

    params = {
        WorkerId: data.WorkerId,
        QualificationTypeId: qid
    };

    if ('number' === typeof args.IntegerValue) {
        params.IntegerValue = args.IntegerValue;
    }
    else {
        params.IntegerValue = data.IntegerValue;
    }

    if ('undefined' !== typeof args.SendNotification) {
        params.SendNotification = args.SendNotification;
    }
    else if ('undefined' !== typeof data.SendNotification) {
        params.SendNotification = data.SendNotification;
    }

    shapi.req('AssignQualification', params, function(res) {
        nQualificationGiven++;
        if (cb) cb();
    }, function (err) {
        errorsQualification.push(err);
        if (cb) cb(err);
    });

    return true;
}
