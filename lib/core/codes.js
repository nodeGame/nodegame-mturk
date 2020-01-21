"use strict";

// ## Codes.

const J = require('JSUS').JSUS;
const NDDB = require('NDDB').NDDB;
const fs = require('fs-extra');
const path = require('path');

const logger = require('../core/logger')();
const cfg = require('../core/config')();

var inputCodesDb, resultsDb, resultsFilteredDb;
var inputCodesErrors, resultsErrors;
var validateLevel;

// Statistics about the results file computed at loading time.
var currentStats;

// TODO: Maybe the files variables should be globals.

/**
 * ### loadResults
 *
 * Loads synchronously a result file from fs into a dedicated NDDB db
 *
 * If a results db is already existing either "append" or "replace" needs to
 * to be passed as parameter.
 *
 * @param {object} args Object containing options, potentially same as
 *   from command line. Options: append, replace, validateLevel, loadOptions
 * @param {function} cb Optional. Callback to be executed upon success
 *   or failure
 *
 * @return {boolean} TRUE on success
 *
 * @see resultsDb
 */
function loadResults(args, cb) {
    var resultsFile;
    var loadOptions;
    var str;

    // Checking options.
    if (!checkOptions('results', args, cb)) return;

    resultsFile = checkPath('resultsFile', args.path, cb);
    if (!resultsFile) return;
    logger.info('results file: ' + resultsFile);

    // Validate Level and Params.
    validateLevel = args.validateLevel || cfg.validateLevel;
    if (validateLevel !== cfg.validateLevel) {
        logger.info('custom validation level: ' + validateLevel);
    }

    // Setting up results database for import.

    if (resultsDb) {
        if (args.replace) {
            resultsDb = createResultsDb();
        }
        else if (!args.append) {
            logger.error('results db already found. Use options: ' +
                         '"replace", "append"');

            if (cb) cb();
            return;
        }
    }
    else {
        resultsDb = createResultsDb();
    }

    // Loading results file.
    loadOptions = {
        separator: ',',
        quote: '"',
        headers: true
    };
    if (cfg.loadOptions) J.mixin(loadOptions, cfg.loadOptions);
    resultsDb.loadSync(resultsFile, loadOptions);

    // Print summary.
    str = 'result codes: ' + resultsDb.size();
    if (currentStats.results.filtered > 0) {
        str += ' (+' + currentStats.results.filtered + ' filtered)';
    }
    logger.info(str);

    if (cb) cb();
    return true;
}

/**
 * ### loadInputCodes
 *
 * Loads synchronously a file containining the input codes
 *
 * Input codes are optionally used to validate a results file.
 *
 * If a input-codes db is already existing either "append"
 * or "replace" needs to to be passed as parameter.
 *
 * @param {object} args Object containing options, potentially same as
 *   from command line. Options: append, replace, validateLevel, loadOptions
 * @param {function} cb Optional. Callback to be executed upon success
 *   or failure
 *
 * @return {boolean} TRUE on success
 *
 * @see inputCodesDb
 */
function loadInputCodes(args, cb) {
    var inputCodesFile;
    var loadOptions;

    if (!checkOptions('input', args, cb)) return;

    inputCodesFile = checkPath('inputCodesFile', args.inputCodesFile, cb);
    if (!inputCodesFile) return;
    logger.info('input codes file: ' + inputCodesFile);

    if (inputCodesDb) {
        if (args.replace) {
            inputCodesDb = createInputCodesDb();
        }
        else if (!args.append) {
            logger.error('inputCodes db already found. Use options: ' +
                         '"replace", "append"');
            if (cb) cb();
            return;
        }
    }
    else {
        inputCodesDb = createInputCodesDb();
    }

    // Loading results file.
    loadOptions = {
        separator: ',',
        quote: '"',
        headers: true
    };
    if (cfg.loadOptions) J.mixin(loadOptions, cfg.loadOptions);
    inputCodesDb.loadSync(inputCodesFile, loadOptions);
    logger.info('input codes: ' + inputCodesDb.size());
    if (inputCodesErrors.length) {
        logger.error('input codes errors: ' + inputCodesErrors.length);
        logger.error('correct the errors before continuing');
        if (cb) cb();
        return;
    }
    if (cb) cb();
    return true;
}

function loadGame(args, cb) {
    if (!cfg.nodeGamePath) {
        logger.error('nodeGamePath is not defined in config file');
        if (cb) cb();
        return;
    }

    let game = args.path;
    console.log();
    logger.info('loading rooms of game ' + game);

    // TODO: handle games_available as well.
    let gamePath = path.join(cfg.nodeGamePath, 'games', game);
    args.path = gamePath;

    if (!checkOptions('game', args, cb)) return;

    // String will be completed with limit info.
    var infoStr = 'scanning data folder';
    var minRoom, maxRoom;

    if (!fs.existsSync(path.join(gamePath, 'package.json'))) {
        logger.error('game ' + game + ' does not contain package.json');
        if (cb) cb();
        return;
    }
    let dataFolder = path.join(gamePath, 'data');
    if (!fs.existsSync(dataFolder)) {
        logger.error('game ' + game + ' does not contain a data folder');
        if (cb) cb();
        return;
    }
    if (args.limit) {
        if ('string' === typeof args.limit) {
            args.limit = args.limit.split('-');
        }
        if (!J.isArray(args.limit)) {
            logger.error('--limit option must be string, array or undefined. ' +
                         'Found: ' + args.limit);
            if (cb) cb();
            return;
        }
        minRoom = J.isInt(args.limit[0], -1);
        if (minRoom === false) {
            logger.error('--limit room option: lower bound must be an ' +
                         'integer > 0 (0 for no lower bound). ' +
                         'Found: ' + args.limit[0]);
            if (cb) cb();
            return;
        }
        if (minRoom !== 0) infoStr += ' minRoom=' + minRoom;
        if (args.limit[1]) {
            maxRoom = J.isInt(args.limit[1], args.limit[0], undefined, true);
            if (maxRoom === false) {
                logger.error('--limit room option: upper bound must be an ' +
                             'integer >= lower bound (0 for no upper bound). ' +
                             'Found: ' + args.limit[0]);
                if (cb) cb();
                return;
            }
            if (maxRoom !== 0) infoStr += ' maxRoom=' + maxRoom;
        }
    }
    let scanning = 0;
    let done = function() { scanning--; }


    logger.info(infoStr);
    fs.readdir(dataFolder, function(err, files) {
        files.forEach(function(file) {
            var filePath;
            // Ignore hidden files/dirs.
            if (file.charAt(0) === '.') return;
            filePath = path.join(dataFolder, file);
            // Every file must be processed.
            // TODO: set logger level.
            // logger.debug('scan room: ' + filePath);
            // Adding a new scanned directory.
            scanning++;
            fs.stat(filePath, function(err, stat) {
                var resultsFile;
                if (stat && stat.isDirectory()) {
                    // Filter room number.
                    if (minRoom || maxRoom) {
                        let roomNum = file.split('room')[1];
                        roomNum = J.isInt(roomNum);
                        if (roomNum) {
                            if (minRoom && roomNum < minRoom) return done();
                            if (maxRoom && roomNum > maxRoom) return done();
                        }
                    }
                    // End filter room number.
                    resultsFile = path.join(filePath, 'bonus.csv');
                    if (!fs.existsSync(resultsFile)) {
                        resultsFile = path.join(filePath, 'results.csv');
                        if (!fs.existsSync(resultsFile)) {
                            resultsFile = path.join(filePath, 'codes.csv');
                            if (!fs.existsSync(resultsFile)) {
                                logger.warn('no results in room ' + file);
                                return done();
                            }
                        }
                    }
                    logger.info('loading results file: ' + file);
                    loadResults({
                        path: resultsFile,
                        append: true
                    }, function() {
                        done();
                        if (cb) cb();
                    });
                }
            });
        });
    });
    let myInterval = setInterval(function() {
        if (scanning === 0) {
            clearInterval(myInterval);
            if (cb) setTimeout(cb);
            return true;
        }
    }, 500);

    return true;
}

// Copied and adapted from ServerNode.
// TODO: make a static ServerNode method.



function checkOptions(type, args, cb) {
    // Append and replace db.
    if (args.append && args.replace) {
        logger.error('cannot append and replace at the same time.');
        if (cb) cb();
        return false;
    }
    if (!checkPath(type, args.path, cb)) {
        return false;
    }
    return true;
}

/**
 * ### checkPath
 *
 * Checks if a file or folder exists and sets into the configuration
 *
 * @param {string} type Either "resultsFile" or "inputCodesFile"
 * @param {string} file Optional The path to the file. Default: what
 *   is stored in configuration
 * @param {function} cb Callback to be executed upon success or failure
 *
 * @return {boolean|string} The validated path, or false upon failure
 */
function checkPath(type, somePath, cb) {
    let errBegin = '--' + type + ': ';
    if (!somePath) {
        logger.error(errBegin + 'path not defined');
        if (cb) cb();
        return false;
    }
    if ('string' !== typeof somePath) {
        logger.error(errBegin + 'path must be string. Found: ' + somePath);
        if (cb) cb();
        return false;
    }
    if (!fs.existsSync(somePath)) {
        logger.error(errBegin + 'path not existing or non-readable: ' +
                     somePath);
        if (cb) cb();
        return false;
    }
    // TODO: make set function.
    cfg[type] = somePath;
    return somePath;
}

/**
 * ### createInputCodesDb
 *
 * Creates a new input-codes db and resets stats
 *
 * @return {NDDB} The db
 */
function createInputCodesDb() {
    var db;

    resetCurrentStats('inputCodes');

    inputCodesErrors = [];
    db = new NDDB();

    db.on('insert', function(code) {
        // Build a map if necessary at first-insert.
        if (cfg.fieldsCaseInsensitive && !cfg.fieldsI) {
            buildInsensitiveMap(i);
        }

        // TODO: More checkings, like in Results.

        if (!code[cfg.fields.workerId]) {
            // Add to array, might dump to file in the future.
            inputCodesErrors.push('missing WorkerId');
            logger.error('invalid input code entry: ' + code);
        }
    });
    db.index('id', function(i) { return i[cfg.fields.workerId]; });
    return db;
}

/**
 * ### createResultsDb
 *
 * Creates a new results db and resets stats
 *
 * Also recreates the filtered-db database.
 *
 * @return {NDDB} The db
 *
 * @see resultsDb
 * @see resultsFilteredDb
 */
function createResultsDb() {
    var db;

    resultsErrors = [];

    // Reset stats. TODO: warn?
    resetCurrentStats('results');

    db = new NDDB({ update: { indexes: true } });

    db.index('id', function(i) {
        return i[cfg.fields.id];
    });
    db.index('wid', function(i) {
        return i[cfg.fields.workerId];
    });
    db.index('aid', function(i) {
        return i[cfg.fields.assignmentId];
    });
    db.index('exit', function(i) {
        return i[cfg.fields.exitCode];
    });

    db.view('disconnected', function(i) {
        if (i[cfg.fields.disconnected]) return i;
    });

    db.view('connected', function(i) {
        if (!i[cfg.fields.disconnected]) return i;
    });

    db.view('bonus', function(i) {
        if (i[cfg.fields.bonus]) return i;
    });

    db.view('qualification', function(i) {
        if (i[cfg.fields.qualificationTypeId]) return i;
    });

    db.hash('status', function(i) {
        if (i[cfg.fields.approve]) return 'approve';
        if (i[cfg.fields.reject]) return 'reject';
        return 'none';
    });

    db.on('insert', function(i) {
        var str, code;
        var propertyValue;
        var ci;

        // Do not insert if it does not pass the filter.
        if (cfg.filter && !cfg.filter(i)) {
            resultsFilteredDb.insert(i);
            currentStats.results.filtered++;
            return false;
        }

        ci = cfg.fieldsCaseInsensitive;

        // Build a map if necessary at first-insert.
        if (ci && !cfg.fieldsI) {
            buildInsensitiveMap(i);
        }

        // Check no duplicates first, then validate actual values.
        propertyValue = getField(i, 'id');
        if (this.id.get(propertyValue)) {
            str = 'duplicate code id ' + propertyValue;
            logger.error(str);
            resultsErrors.push(str);
        }

        propertyValue = getField(i, 'workerId');
        if (this.wid.get(propertyValue)) {
            str = 'duplicate WorkerId ' + propertyValue;
            logger.error(str);
            resultsErrors.push(str);
        }

        propertyValue = getField(i, 'exitCode');
        if (this.exit.get(propertyValue)) {
            str = 'duplicate ExitCode ' + propertyValue;
            logger.error(str);
            resultsErrors.push(str);
        }

        propertyValue = getField(i, 'assignmentId');
        if (this.aid.get(propertyValue)) {
            str = 'duplicate AssignmentId ' + propertyValue;
            logger.error(str);
            resultsErrors.push(str);
        }

        // Add global values, if found.

        //  Qualification Type ID, if found.
        if (cfg.QualificationTypeId) {
            i[cfg.fields.qualificationTypeId] = cfg.QualificationTypeId;
        }
        if (cfg.autoApprove) {
            i[cfg.fields.approve] = 'x';
            i[cfg.fields.reject] = '';
        }

        if (validateLevel) {
            // Standard validation.
            str = validateCode(i);
            if (str) {
                resultsErrors.push(str);
                logger.error(str);
            }
            // Bonus validation.
            str = validateBonus(i);
            if ('string' === typeof str) {
                resultsErrors.push(str);
                logger.error(str);
            }
        }

        // We must validate WorkerId and Exit Code (if found in inputCodes db).
        if (inputCodesDb) {
            if (i[cfg.fields.id]) {
                code = inputCodesDb.id.get(i[cfg.fields.id]);
                if (!code) {
                    str = 'Id (' + cfg.fields.id + ') not found in ' +
                        'inputCodes db: ' + i[cfg.fields.id];
                    logger.warn(str);
                    resultsErrors.push(str);
                }
            }

            if (i[cfg.fields.exitCode]) {
                // Get code only if no id was found.
                if (!code) code = inputCodesDb.exit.get(i[cfg.fields.exitCode]);
                if (!code) {
                    str = 'Exit code (' + cfg.fields.exitCode +
                        ') not found: ' + i[cfg.fields.exitCode];
                }
                else if (i[cfg.fields.exitCode] !== code[cfg.fields.exitCode]) {
                    str = 'ExitCodes (' + cfg.fields.exitCode +
                        ') do not match. WorkerId: ' +
                        code[cfg.fields.workerId] +
                        '. ExitCode: ' + i[cfg.fields.exitCode] +
                        ' (found) vs ' + code[cfg.fields.exitCode] +
                        ' (expected)';
                }
                if (str) {
                    logger.error(str);
                    resultsErrors.push(str);
                }
            }
        }

        // All is OK! Compute statistics.
        computeResultStat(i);

    });

    // Recreate db for filtered-out items.
    resultsFilteredDb = new NDDB();

    return db;
}

/**
 * ### computeResultStat
 *
 * Updates global results stats with info from a new result
 *
 * @param {object} item The item used to update stats
 *
 * @see currentStats
 */
function computeResultStat(item) {
    var b, stat;
    stat = currentStats.results;
    b = item[cfg.fields.bonus];
    if (b) {
        stat.bonus.count++;
        stat.bonus.total += b;
        if ('NA' === stat.bonus.max || b > stat.bonus.max) {
            stat.bonus.max = b;
        }
        if ('NA' === stat.bonus.min || b < stat.bonus.min) {
            stat.bonus.min = b;
        }
        stat.bonus.sumSquared += Math.pow(b, 2);
    }
    if (item[cfg.fields.reject]) stat.result.rejectCount++;
    else if (item[cfg.fields.approve]) stat.result.approveCount++;
    if (item[cfg.fields.qualificationTypeId]) stat.qualification.count++;
}


/**
 * ### validateBonus
 *
 * Returns TRUE if a bonus is within min and max accepted values
 *
 * @param {object} result The result item
 *
 * @return {string|undefined} Returns an error string if an error occurred
 */
function validateBonus(result) {
    var bonusField;
    bonusField = cfg.fields.bonus;
    if (result[bonusField] < cfg.minBonus ||
        result[bonusField] > cfg.maxBonus) {

        return 'wrong bonus: ' + result[bonusField];
    }
}

/**
 * ### validateCode
 *
 * Validates and type-cast the properties of a code
 *
 * @param {object} The code to validate
 */
function validateCode(code) {
    var tmp, propName, wid;

    // Code Id can be non-string?
    //  if ('string' !== typeof code.id) {
    //      return 'code.id must be string. Found: ' + code.id;
    //  }

    propName = cfg.fields.workerId;
    wid = code[propName];
    if ('string' !== typeof wid || wid.trim() === '') {
        return propName + ' must be string. Found: ' + wid;
    }

    propName = cfg.fields.assignmentId;
    if ('string' !== typeof code[propName] || code[propName].trim() === '') {
        return propName + ' must be string. Found: ' +
            code[propName] + '. WorkerId: ' + wid;
    }

    propName = cfg.fields.hitId;
    if (code.hasOwnProperty(propName)) {
        if ('string' !== typeof code[propName] ||
            code[propName].trim() === '') {

            return propName + ' must be string or undefined. ' +
                code[propName]  + '. WorkerId: ' + wid;
        }
    }
    if (cfg.HITId && code[propName] !== cfg.HITId) {
        return propName + ' not matching. Expected: ' +
            cfg.HITId + '. Found: ' + code[propName] + '. WorkerId: ' + wid;
    }

    propName = cfg.fields.bonus;
    if (code.hasOwnProperty(propName)) {
        tmp = J.isNumber(code[propName]);
        if (false === tmp) {
            return propName + ' must be number or undefined. Found ' +
                code[propName] + '. WorkerId: ' + wid;
        }
        // Make sure it is a number.
        code[propName] = tmp;
        if (code[propName] < 0) {
            return propName + ' cannot be negative: ' +
                code[propName] + '. WorkerId: ' + wid;
        }
    }

    propName = cfg.fields.reason;
    if (code.hasOwnProperty(propName)) {
        if ('string' !== typeof code[propName] ||
            code[propName].trim() === '') {

            return propName + ' must be string or undefined. ' +
                '. Found ' + code[propName] + '. WorkerId: ' + wid;
        }
    }

    propName = cfg.fields.exitCode;
    if (code.hasOwnProperty(propName)) {
        if ('string' !== typeof code[propName] ||
            code[propName].trim() === '') {

            return propName + ' must be string ' +
                'or undefined. Found ' + code[propName] +
                '. WorkerId: ' + wid;
        }
    }

    propName = cfg.fields.qualificationTypeId;
    if (code.hasOwnProperty(propName)) {
        if ('string' !== typeof code[propName] ||
            code[propName].trim() === '') {

            return propName + ' must be string or undefined. ' +
                '. Found ' + code[propName] + '. WorkerId: ' + wid;
        }
    }

    propName = cfg.fields.integerValue;
    if (code.hasOwnProperty(propName)) {
        tmp = J.isInt(code[propName]);
        if (false === tmp) {
            return propName + ' must be string, number or undefined. ' +
                '. Found ' + code[propName] + '. WorkerId: ' + wid;
        }
        // Enforce number type.
        code[propName] = tmp;
    }

    // Approve or Reject.
    if (code[cfg.fields.reject] && code[cfg.fields.approve]) {
        return cfg.fields.approve + ' and ' + cfg.fields.reject  +
            ' both selected. WorkerId: ' + wid;
    }
    else if (!code[cfg.fields.reject] && !code[cfg.fields.approve]) {
        return 'Neither ' + cfg.fields.approve + ' or ' + cfg.fields.reject +
            ' selected. WorkerId: ' + wid;
    }

    propName = cfg.fields.assignmentStatus;
    if (code.hasOwnProperty(propName)) {
        if (code[propName] !== 'Submitted') {
            return propName + ' must be undefined or "Submitted". ' +
                'Found: "' + code[propName] + '". WorkerId: ' + wid;
        }
    }

    // Constraints: Can be up to 1024 characters
    // (including multi-byte characters).
    // The RequesterFeedback parameter cannot contain ASCII
    // characters 0-8, 11,12, or 14-31. If these characters
    // are present, the operation throws an InvalidParameterValue error.
    propName = cfg.fields.requesterFeedback;
    if (code.hasOwnProperty(propName)) {
        if ('string' !== typeof code[propName] ||
            code[propName].trim() === '' ||
            code[propName].length > 1024) {

            return 'Invalid ' + propName + ': ' +
                code[propName] + ' WorkerId: ' + wid;
        }
    }
}

/**
 * ### resetCurrentStats
 *
 * Resets current global statistics
 *
 * TODO: accept options, selective reset.
 *
 * @see currentStats
 */
function resetCurrentStats() {

    currentStats = {
        results: {
            bonus: {
                count: 0,
                total: 0,
                max: 'NA',
                min: 'NA',
                sumSquared: 0
            },
            result: {
                rejectCount: 0,
                approveCount: 0
            },
            qualification: {
                count: 0
            },
            filtered: 0
        },
        inputCodes: {}
    };
}

/**
 * ### getCurrentStats
 *
 * Returns the value of current stats
 *
 * @param {string} mod Select what information to return
 *
 * @return {object} The requested stat
 *
 * @see currentStats
 * @see resetCurrentStats
 */
function getCurrentStats(mod) {
    if (mod === 'bonus') return currentStats.results.bonus;
    if (mod === 'result') return currentStats.results.result;
    if (mod === 'qualification') return currentStats.results.qualification;
    if (mod === 'filtered') return currentStats.results.filtered;
    return currentStats;
}

/**
 * ### getField
 *
 * Gets the requested `fields` property potentially case-insensitive
 *
 * @param {object} obj The object containing the property
 * @param {string} prop The name of the property
 *
 * @return {mixed} The value of the property
 *
 * @see cfg.fields
 */
function getField(obj, prop) {
    return obj[cfg.fields[prop]];
}

/**
 * ### getInsensitive
 *
 * Finds the property that matches case-insensitive another name
 *
 * First match is returned.
 *
 * @param {object} obj The object containing the property
 * @param {string} prop The name of the property
 *
 * @return {string|boolean} The name of the matched property, or
 *   FALSE, if no match is found
 */
function getInsensitive(obj, prop) {
    var res, propName;
    for (propName in obj) {
        if (obj.hasOwnProperty(propName)) {
            if (prop === propName.toLowerCase()) {
                return propName;
            }
        }
    }
    return false;
}


/**
 * ### buildInsensitiveMap
 *
 * Builds a map of case-insensitive field names based on a single item
 *
 * If the object does not contain a property, the current value is kept.
 *
 * @param {object} obj The object used to build the map
 *
 * @return {string|boolean} The name of the matched property, or
 *   FALSE, if no match is found
 *
 * @see cfg.fields
 * @see cfg.fieldsI
 */
function buildInsensitiveMap(i) {
    var str, strValue, strValueL;
    for (str in cfg.fields) {
        if (cfg.fields.hasOwnProperty(str)) {
            strValue = cfg.fields[str];
            strValueL = strValue.toLowerCase();
            cfg.fields[str] = getInsensitive(i, strValueL) || strValue;
        }
    }
    // Flag that fields insensitive-comparison is done.
    cfg.fieldsI = true;
}

// ## Exports methods.

module.exports = {
    loadGame: loadGame,
    loadResults: loadResults,
    loadInputCodes: loadInputCodes,
    getResultsDb: function(check, cb) {
        if (check && (!resultsDb || !resultsDb.size())) {
            logger.error('no results found. load a results file first.');
            if (cb) cb();
            return false;
        }
        return resultsDb;
    },
    getInputCodesDb: function(check, cb) {
        if (check && (!inputCodesDb || !inputCodesDb.size())) {
            logger.error('no input code found. Try "load inputCodes" first.');
            if (cb) cb();
            return false;
        }
        return inputCodesDb;
    },
    resetStats: resetCurrentStats,
    getStats: getCurrentStats
};
