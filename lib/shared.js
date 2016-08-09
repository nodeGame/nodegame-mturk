// ## Helper functions.

var J = require('JSUS').JSUS;

module.exports = {
    validateResult: validateResult,
    validateCode: validateCode
};

function validateResult(result, opts) {
    var bonusField;
    opts = opts || {};
    bonusField = opts.bonusField || 'bonus';
    if (result[bonusField] < 0 || result[bonusField] > 10) {
        return 'wrong bonus: ' + result[bonusField];
    }
}

function validateCode(code, opts) {
    var bonusField, exitCodeField, HITId;
    opts = opts || {};
    bonusField = opts.bonusField || 'bonus';
    exitCodeField = opts.exitCodeField || 'Answer.surveycode';
    HITId = opts.HITId;

    if ('object' !== typeof code) {
        return 'code must object. Found: ' + code;
    }

//     if ('string' !== typeof code.id) {
//         return 'code.id must be string. Found: ' + code.id;
//     }

    if ('string' !== typeof code.WorkerId) {
        return 'code.WorkerId must be string. Found: ' + code.WorkerId;
    }

    if ('string' !== typeof code.AssignmentId) {
        return 'code.AssignmentId must be string. Found: ' +
            code.AssignmentId + '. WorkerId: ' + code.WorkerId;
    }

    if (code.HITId) {
        if ('string' !== typeof code.HITId) {
            return 'code.HITId must be string or undefined. ' +
                code.HITId + '. WorkerId: ' + code.WorkerId;
        }
    }

    if (code[bonusField]) {
        if ('number' !== typeof code[bonusField]) {
            return 'code.' + bonusField + ' must be number ' +
                'or undefined. Found ' + code[bonusField] +
                '. WorkerId: ' + code.WorkerId;
        }
        if (code[bonusField] < 0) {
            return 'code.' + bonusField + ' cannot be negative: ' +
                code[bonusField] + '. WorkerId: ' + code.WorkerId;
        }
    }

    if (code.Reason &&
        ('string' !== typeof code.Reason || code.Reason.trim() === '')) {


        return 'code.Reason must be string or undefined. ' +
            '. Found ' + code.Reason + '. WorkerId: ' + code.WorkerId;
    }

    if (code[exitCodeField]) {
        if ('string' !== typeof code[exitCodeField] ||
            code[exitCodeField].trim() === '') {

            return 'code.' + exitCodeField + ' must be a non-empty string ' +
                'or undefined. Found ' + code[exitCodeField] +
                '. WorkerId: ' + code.WorkerId;
        }
    }

    if (code.QualificationTypeId) {
        if ('string' !== typeof code.QualificationTypeId ||
            code.QualificationTypeId.trim() === '') {

            return 'code.QualificationTypeId must be string or undefined. ' +
                '. Found ' + code.QualificationTypeId + '. WorkerId: ' +
                code.WorkerId;
        }
    }

    if (code.IntegerValue) {
        if (false === J.isInt(code.IntegerValue)) {

            return 'code.IntegerValue must be string, number or undefined. ' +
                '. Found ' + code.IntegerValue + '. WorkerId: ' + code.WorkerId;
        }
    }

    // Approve or Reject.
    if (code.Reject && code.Approve) {
        return 'Approve and Reject both selected. WorkerId: ' + code.WorkerId;
    }
    else if (!code.Reject && !code.Approve) {
        return 'Neither Approve or Reject selected. WorkerId: ' +
            code.WorkerId;
    }

    // Constraints: Can be up to 1024 characters
    // (including multi-byte characters).
    // The RequesterFeedback parameter cannot contain ASCII
    // characters 0-8, 11,12, or 14-31. If these characters
    // are present, the operation throws an InvalidParameterValue error.
    if (code.RequesterFeedback) {
        if ('string' !== typeof code.RequesterFeedback ||
            code.RequesterFeedback.trim() === '' ||
            code.RequesterFeedback.length > 1024) {

            return 'Invalid RequesterFeedback: ' +
                code.RequesterFeedback + ' WorkerId: ' + code.WorkerId;
        }
    }

    if (HITId && code.HITId !== HITId) {
        return 'code.HITId does not matching. Expected: ' +
            HITId + '. Found: ' + code.HITid + '. WorkerId: ' + code.WorkerId;
    }

}
