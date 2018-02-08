'use strict';

exports.__esModule = true;
exports.loadReportFromYAML = exports.loadReportFromFile = exports.cleanUpDependencies = exports.getURL = exports.validateSPDX = exports.checkDependency = exports.excludeRepositories = exports.formatResultObject = exports.formatDependency = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _spdx = require('spdx');

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var formatDependency = function formatDependency(_ref) {
    var name = _ref.name,
        version = _ref.version,
        url = _ref.url,
        spdx = _ref.spdx,
        licenseFile = _ref.licenseFile,
        noticeFile = _ref.noticeFile,
        otherProps = _objectWithoutProperties(_ref, ['name', 'version', 'url', 'spdx', 'licenseFile', 'noticeFile']);

    return _extends({
        name: name,
        version: version,
        url: url,
        spdx: spdx
    }, otherProps, {
        licenseFile: licenseFile,
        noticeFile: noticeFile
    });
};

exports.formatDependency = formatDependency;
var formatResultObject = exports.formatResultObject = function formatResultObject(dependencies, _ref2) {
    var title = _ref2.title,
        description = _ref2.description,
        language = _ref2.language;

    var result = {};

    var deps = _lodash2.default.chain(dependencies).filter(_lodash2.default.isObject).sortBy(['name', 'version']).map(formatDependency).value();

    result[title] = {
        description: description,
        language: language,
        dependencies: deps
    };

    return result;
};

var excludeRepositories = exports.excludeRepositories = function excludeRepositories(excludeRepositoryRegex, module) {
    var repository = _lodash2.default.get(module, 'repository.url', module.repository);

    return _lodash2.default.isString(repository) && excludeRepositoryRegex.test(repository);
};

var checkDependency = exports.checkDependency = function checkDependency(module) {
    var name = module.name,
        version = module.version;

    if (!_lodash2.default.isString(name) || _lodash2.default.isEmpty(name)) {
        throw new Error('Name is missing');
    }
    if (!_lodash2.default.isString(version) || _lodash2.default.isEmpty(version)) {
        throw new Error('Module [' + name + ']: Version is missing');
    }
};

var validateSPDX = exports.validateSPDX = function validateSPDX(module) {
    var license = module.license;


    if (_lodash2.default.isString(license) && (0, _spdx.valid)(license)) {
        return _extends({}, module, { spdx: license });
    }

    return module;
};

var getURL = exports.getURL = function getURL(module) {
    var name = module.name,
        homepage = module.homepage,
        repository = module.repository;


    var url = homepage || _lodash2.default.get(repository, 'url', repository);

    if (!_lodash2.default.isString(url) || _lodash2.default.isEmpty(url)) {
        url = 'https://www.npmjs.com/package/' + name;
    }

    return _extends({}, module, { url: url });
};

var getContentsSync = function getContentsSync(file) {
    try {
        var stats = _fs2.default.statSync(file);
        if (stats.isFile()) {
            return '---\n' + _fs2.default.readFileSync(file, 'utf8');
        }
    } catch (e) {
        console.warn(e, file);
    }
    return false;
};

var cleanUpDependencies = exports.cleanUpDependencies = function cleanUpDependencies(dependencies) {
    var regex = /(gitlab.eccenca.com)|(github.com\/elds\/)|(github.com\/eccenca\/)/;

    var additions = [];

    return _lodash2.default.chain(dependencies).clone().map(validateSPDX).map(getURL).map(function (_ref3) {
        var name = _ref3.name,
            version = _ref3.version,
            url = _ref3.url,
            license = _ref3.license,
            licenses = _ref3.licenses,
            path = _ref3.path,
            repository = _ref3.repository;

        var lfc = false;
        var nfc = false;

        var dirList = _lodash2.default.chain(_fs2.default.readdirSync(path, 'utf8'));

        var noticeFile = dirList.filter(function (file) {
            return (/^(notice|patent)/i.test(file)
            );
        }).map(function (file) {
            return (0, _path.join)(path, file);
        }).first().value();

        var licenseFile = dirList.filter(function (file) {
            return (/^(license|copying)/i.test(file)
            );
        }).map(function (file) {
            return (0, _path.join)(path, file);
        }).first().value();

        var additionalLicenses = dirList.filter(function (file) {
            return (/^additionalLicenses\.yml/i.test(file)
            );
        }).map(function (file) {
            return (0, _path.join)(path, file);
        }).first().value();

        if (_lodash2.default.isString(noticeFile)) {
            nfc = getContentsSync(noticeFile);
        }

        if (_lodash2.default.isString(licenseFile)) {
            lfc = getContentsSync(licenseFile);
        }

        if (_lodash2.default.isString(additionalLicenses)) {
            try {
                var _loadReportFromFile = loadReportFromFile(additionalLicenses, true),
                    additionalDependencies = _loadReportFromFile.dependencies;

                additions = _lodash2.default.concat(additions, additionalDependencies);
            } catch (e) {
                console.warn(e);
            }
        }

        return {
            name: name,
            version: version,
            spdx: license,
            guessedLicense: licenses,
            licenseFile: lfc,
            noticeFile: nfc,
            url: url,
            repository: repository
        };
    }).thru(function (value) {
        return _lodash2.default.concat(value, additions);
    }).reject(excludeRepositories.bind(null, regex)).sortBy('name', 'version').value();
};

var loadReportFromFile = exports.loadReportFromFile = function loadReportFromFile(file) {
    var failOkay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    if (failOkay) {
        try {
            _fs2.default.accessSync(file, _fs2.default.F_OK);
        } catch (e) {
            var _options$language = options.language,
                language = _options$language === undefined ? 'javascript' : _options$language,
                _options$description = options.description,
                description = _options$description === undefined ? 'description' : _options$description,
                _options$project = options.project,
                project = _options$project === undefined ? 'Project' : _options$project;

            return { project: project, language: language, description: description, dependencies: [] };
        }
    }

    var report = void 0;

    try {
        report = _fs2.default.readFileSync(file, 'utf8');
    } catch (e) {
        throw new Error('Could not load ' + file);
    }

    return loadReportFromYAML(report);
};

var loadReportFromYAML = exports.loadReportFromYAML = function loadReportFromYAML(yamlString) {
    var yamlData = void 0;
    try {
        yamlData = _jsYaml2.default.load(yamlString, 'utf8');
    } catch (e) {
        throw new Error('Could not load ' + yamlString);
    }

    if (_lodash2.default.keys(yamlData) > 1) {
        throw new Error(yamlData + ' should just contain 1 project, it contains ' + _lodash2.default.keys(yamlData));
    }

    var project = _lodash2.default.first(_lodash2.default.keys(yamlData));

    var _$sample = _lodash2.default.sample(yamlData),
        language = _$sample.language,
        description = _$sample.description,
        dependencies = _$sample.dependencies;

    return { project: project, language: language, description: description, dependencies: dependencies };
};