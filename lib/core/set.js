const cfg = require('./config')();
const logger = require('./logger')();

function setHIT(hit) {
    cfg.HITId = hit.HITId;
    logger.info('set HIT id: ' + cfg.HITId + ' ("' +
                hit.Title + '" | $' + hit.Reward + ')');
}


module.exports = {
    HIT: setHIT
};
