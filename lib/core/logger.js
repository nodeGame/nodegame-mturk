"use strict";

var winston = require('winston');

var logger;
module.exports = function(program) {
    if (!logger) {
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
    return logger;
};
