'use strict';

var _report = require('./lib/report');

var _yaml2json = require('./lib/yaml2json');

var _spdxList = require('./lib/spdx-list');

var _consolidate = require('./lib/consolidate');

module.exports = {
    __esModule: true,
    report: _report.report,
    yaml2json: _yaml2json.yaml2json,
    spdxLicenseList: _spdxList.spdxLicenseList,
    commands: {
        reportCMD: _report.default,
        consolidateCMD: _consolidate.default,
        yaml2jsonCMD: _yaml2json.default
    }
};
