"use strict";

const path = require('path');

var logger;
module.exports = function(program, customLogger) {
    if (logger) return logger;

    // Custom logger.
    if (customLogger) {
        logger = customLogger;
    }
    // Default logger.
    else {
        const { createLogger, format, transports } = require('winston');
        const { combine, timestamp, label, printf } = format;

        program = program || {};
        logger = createLogger();
        logger.add(new transports.Console({
            level: program.quiet ? 'error' : 'silly',
            format: combine(
                format.colorize(),
                format.simple()
            )
        }));
        logger.add(new transports.File({
            filename: path.join('log', 'nodegame-mturk.log'),
            level: 'silly'
        }));
    }

    return logger;
};
