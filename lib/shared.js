// ## Helper functions.

module.exports = {
    validateResult: validateResult,
    validateCode: validateCode,
    validateCodeWithHITId: validateCodeWithHITId
};

function validateResult(result, bonusField) {
    bonusField = bonusField || 'bonus';
    if (result[bonusField] < 0 || result[bonusField] > 10) {
        return 'wrong bonus: ' + result[bonusField];
    }
}

function validateCode(code, bonusField) {
    bonusField = bonusField || 'bonus';

    if ('object' !== typeof code) {
        return 'code must object. Found: ' + code;
    }

    if ('string' !== typeof code.id) {
        return 'code.id must be string. Found: ' + code.id;
    }

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


        return 'code.Reason must be number or undefined. ' +
            '. Found ' + code.Reason + '. WorkerId: ' + code.WorkerId;
    }

    // Approve or Reject.
    if (code.Reject && code.Approve) {
        return 'Approve and Reject both selected. WorkerId: ' + code.WorkerId;
    }
    else if (!code.Reject && !code.Approve) {
        return 'Neither Approve and Reject selected. WorkerId: ' +
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

}

function validateCodeWithHITId(code, HITId, bonusField) {
    var str;
    str = validateCode(code, bonusField);
    if (str) return str;
    if (code.HITId !== HITId) {
        return 'code.HITId does not matching. Expected: ' +
            HITId + '. Found: ' + code.HITid + '. WorkerId: ' + code.WorkerId;
    }
}
