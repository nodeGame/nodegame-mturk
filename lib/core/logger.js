"use strict";

var logger;
module.exports = function(program, customLogger) {
    var winston;

    if (!logger) {
        // Custom logger.
        if (customLogger) {
            logger = customLogger;
        }
        // Default logger.
        else {
            winston = require('winston');
            program = program || {};
            logger = new winston.Logger({
                transports: [
                    new (winston.transports.Console)({
                        colorize: true,
                        level: program.quiet ? 'error' : 'silly'
                    }),
                    new (winston.transports.File)({
                        filename: 'log/nodegame-mturk.log',
                        level: 'silly'
                    })
                ]
            });
        }
    }

    return logger;
};
