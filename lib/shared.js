// ## Helper functions.

module.exports = {

    validateResult: function validateResult(result, bonusField) {
        bonusField = bonusField || 'bonus';
        if (result[bonusField] < 0 || result[bonusField] > 10) {
            return 'wrong bonus: ' + result[bonusField];
        }
    },

    validateCode: function validateCode(code, bonusField) {
        bonusField = bonusField || 'bonus';

        if ('object' !== typeof code) {
            return 'code must object. Found: ' + code;
        }

        if ('string' === typeof code.id) {
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

        if (config.HITId && code.HITId !== config.HITId) {
            return 'code.HITId does not match configuration file. ' +
                'Expected: ' + config.HITId + '. Found: ' + code.HITid +
                '. WorkerId: ' + code.WorkerId;
        }
    }
};
