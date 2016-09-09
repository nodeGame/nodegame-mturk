/**
 * # ngamt
 * Copyright(c) 2016 Stefano Balietti
 * MIT Licensed
 *
 * Handles communication between nodeGame server and AMT server
 *
 * http://www.nodegame.org
 * ---
 */

var fs = require('fs'); // or -extra
var mturk = require('mturk-api');


module.exports = NodeGameAMT;

// reference to node ?
function NodeGameAMT(channel, options) {
    var that, config;

    options = options || {};

    if ('object' !== typeof channel) {
        throw new TypeError('NodeGameAMT constructor: ' +
                            'channel must be object. Found: ' + channel);
    }

    if ('object' !== typeof channel.registry) {
        throw new TypeError('NodeGameAMT constructor: channel does not ' +
                            'contain a valid registry. Found: ' +
                            channel.registry);
    }


    this.channel = channel

    this.registry = channel.registry;

    // Add index WorkerId.
    this.registry.index('WorkerId', function(i) { return i.WorkerId; });


    this.log = channel.sysLogger;

    /**
     * ## uniqueToken
     *
     * Unique token for AMT operations like grant bonuses, etc.
     */
    this.uniqueToken = options.uniqueToken || 0;

    /**
     * ## inProgress
     *
     * List of unique operations in progress
     *
     * Operations are indexed by uniqueToken
     */
    this.inProgress = {};

    // Config.
    if ('undefined' === typeof options.config) {
        config = require('./conf/mturk.conf.js');
    }
    else {
        config = options.config;
    }
    if ('object' !== typeof config) {
        throw new TypeError('NodeGameAMT constructor: config ' +
                            'must be object. Found: ' + config);
    }

    // TODO: validate config.

    that = this;
    mturk.createClient(config).then(function(api) {
        this.api = api;
        // Call onready callback.
        if (options.onready) options.onready.call(that, api);
    });

}

NodeGameAMT.prototype.getUniqueCode = function() {
    return ++this.uniqueToken;
};


NodeGameAMT.prototype.req = function() {
    // Do proper timeout.
};

/**
 * ### NodeGameAMT.checkOut
 *
 * Checks
 *
 */
NodeGameAMT.prototype.approveAssignment = function(code, opts) {
    var params, that;

    // Build params object.
    params = { AssignmentId: code.AssignmentId };
    if (opts.RequesterFeedback) {
        // Notice! must be < 1024 chars.
        params.RequesterFeedback = opts.RequesterFeedback;
    }

    // Do request.
    that = this;
    this.api.req('ApproveAssignment', params)
        .then(function(res) {

        }).catch(function(err) {
            console.log(err);
        });
};


NodeGameAMT.prototype.grantBonus = function(code, opts) {
    var params, validBonus;

    code = this.validateCode(code, 'grantBonus');

    if ('number' !== typeof code.bonus) {
        throw new TypeError('NodeGameAMT.grantBonus: bonus must be number. ' +
                            'Found: ' + code.bonus);
    }
    if (code.bonus < 0) {
        throw new Error('NodeGameAMT.grantBonus: bonus cannot be negative: ' +
                        code.bonus);
    }

    // Only a positive bonus can be granted.
    if (code.bonus > 0) {

        validBonus = this.validateBonus(code);

        if ('string' === typeof validBonus) {
            this.log('NodeGameAMT.grantBonus: bonus did not validate: ' +
                     validBonus + '. Code: ' + code, 'error');
            return;
        }

        params = {
            WorkerId: code.WorkerId,
            AssignmentId: code.AssignementId,
            BonusAmount: {
                Amount: code.bonus,
                CurrencyCode: 'USD'
            },
            UniqueRequestToken: that.getUniqueToken()
        };
        this.api.req('GrantBonus', params)
            .then(function(res) {
                console.log(res);
            })
            .catch(function(err) {
                // Redo if possible.
                console.log(err);
            });
    }

};

/**
 * ### NodeGameAMT.validateCode
 *
 * Checks if a code is valid, or throws an error otherwise
 *
 * A code is valid contains properties:
 *
 *    - id
 *    - AssignmentId
 *    - WorkerId
 *
 * @param {string|object} code The code to validate or the id of the code
 *   to look up
 * @param {string} method The name of the method invoking the validation
 */
NodeGameAMT.prototype.validateCode = function(code, method) {
    if ('string' === typeof code) {
        code = this.registry.getClient(code);
        if (!code) {
            throw new Error('NodeGameAMT.' + method + ': no client ' +
                            'found with id: ' + code);
        }
    }
    else if ('object' !== typeof code) {
        throw new TypeError('NodeGameAMT.' + method + ': code must ' +
                            'be string or object. Found: ' + code);
    }

    if ('string' === typeof code.id) {
        throw new TypeError('NodeGameAMT.' + method + ': code.id must be ' +
                            'string. Found: ' + code.id);
    }

    if ('string' !== typeof code.WorkerId) {
        throw new Error('NodeGameAMT.' + method + ': code.WorkerId ' +
                        'must be string. Code: ' + code);
    }

    if ('string' !== typeof code.AssignmentId) {
        throw new Error('NodeGameAMT.' + method + ': code.AssignmentId ' +
                        'must be string. Code: ' + code);
    }

    return code;
};
