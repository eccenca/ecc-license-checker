'use strict';

exports.__esModule = true;
var json = require('../data/licenses.json');

var licenses = json.licenses,
    licenseListVersion = json.licenseListVersion,
    releaseDate = json.releaseDate;
exports.spdxLicenseList = licenses;
exports.licenseListVersion = licenseListVersion;
exports.releaseDate = releaseDate;