const cfg = require('./config')();
const logger = require('./logger')();

function setHIT(hit) {
    cfg.HITId = hit.HITId;
    logger.info('set HIT id: ' + cfg.HITId + ' ("' +
                hit.Title + '" | $' + hit.Reward + ')');
}

function setQualificationType(q) {   
    cfg.QualificationTypeId = q.QualificationTypeId;
    logger.info('set QualificationTypeId: ' + q.QualificationTypeId +
                ' ("' + q.Name + '")');
}

module.exports = {
    HIT: setHIT,
    QualificationType: setQualificationType
};
