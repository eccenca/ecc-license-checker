const reportCMD = require('./src/cli/report');

const yaml2jsonCMD = require('./src/cli/yaml2json');

const spdxList = require('./src/spdx-list');

const consolidateCMD = require('./src/cli/consolidate');

const {report, yaml2json} = require('./src/util');

module.exports = {
    report,
    yaml2json,
    spdxLicenseList: spdxList.spdxLicenseList,
    commands: {
        reportCMD,
        consolidateCMD,
        yaml2jsonCMD
    }
};
