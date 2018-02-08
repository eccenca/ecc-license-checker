'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

var _clear = require('clear');

var _clear2 = _interopRequireDefault(_clear);

var _spdx = require('spdx');

var _spdx2 = _interopRequireDefault(_spdx);

var _cliTable = require('cli-table');

var _cliTable2 = _interopRequireDefault(_cliTable);

var _commandLineArgs = require('command-line-args');

var _commandLineArgs2 = _interopRequireDefault(_commandLineArgs);

var _inquirer = require('inquirer');

var _inquirer2 = _interopRequireDefault(_inquirer);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var propsWhitelist = ['name', 'version', 'url', 'spdx', 'licenses', 'notices', 'noticeFile', 'licenseFile', 'downloadUrl'];

var replacePrompt = function replacePrompt(deleteCandidate, replacementCandidates) {
    var name = deleteCandidate.name,
        version = deleteCandidate.version,
        _deleteCandidate$lice = deleteCandidate.licenses,
        licenses = _deleteCandidate$lice === undefined ? '---' : _deleteCandidate$lice,
        _deleteCandidate$spdx = deleteCandidate.spdx,
        spdx = _deleteCandidate$spdx === undefined ? '---' : _deleteCandidate$spdx,
        _deleteCandidate$lice2 = deleteCandidate.licenseFile,
        licenseFile = _deleteCandidate$lice2 === undefined ? '---' : _deleteCandidate$lice2;


    var choices = [{ name: 'Delete from curated list', value: true }, { name: 'Keep on curated list', value: false }];

    console.log('[OBSOLETE DEPENDENCY]: ' + name + '@' + version + ' not found within the dependencies');

    if (_lodash2.default.size(replacementCandidates) > 0) {
        choices.push(new _inquirer2.default.Separator());

        console.log('There may be suitable replacements:');

        var table = new _cliTable2.default({
            head: ['', 'SPDX', 'License', 'License File'],
            colWidths: [35, 30, 30, 100]
        });

        var row = {};

        row['Curr: ' + name + '@' + version] = ['' + spdx, '' + licenses, '' + licenseFile];

        table.push(row);

        _lodash2.default.forEach(replacementCandidates, function (x) {
            var newName = x.name,
                newVersion = x.version,
                guessedLicense = x.guessedLicense,
                _x$spdx = x.spdx,
                newSpdx = _x$spdx === undefined ? '---' : _x$spdx,
                _x$licenseFile = x.licenseFile,
                newLicenseFile = _x$licenseFile === undefined ? '---' : _x$licenseFile;


            row = {};

            row['New: ' + newName + '@' + newVersion] = ['' + newSpdx, 'Guessed: ' + guessedLicense, '' + newLicenseFile];

            table.push(row);

            choices.push({
                name: 'Bump version to ' + newVersion + ' (DO ONLY IF LICENSE DID NOT CHANGE)',
                value: x
            });
        });

        console.log(table.toString());
    }

    return _inquirer2.default.prompt([{
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        default: true,
        choices: choices
    }]).then(function (_ref) {
        var action = _ref.action;

        if (_lodash2.default.isBoolean(action)) {
            return { deleteFromCurated: action };
        }
        return { deleteFromCurated: true, replaceWith: action };
    });
};

var addPrompt = function addPrompt(additionCandidate) {
    var name = additionCandidate.name,
        version = additionCandidate.version,
        url = additionCandidate.url,
        noticeFile = additionCandidate.noticeFile,
        _additionCandidate$gu = additionCandidate.guessedLicense,
        guessedLicense = _additionCandidate$gu === undefined ? '---' : _additionCandidate$gu,
        _additionCandidate$sp = additionCandidate.spdx,
        spdx = _additionCandidate$sp === undefined ? '---' : _additionCandidate$sp,
        _additionCandidate$li = additionCandidate.licenseFile,
        licenseFile = _additionCandidate$li === undefined ? false : _additionCandidate$li,
        otherProps = _objectWithoutProperties(additionCandidate, ['name', 'version', 'url', 'noticeFile', 'guessedLicense', 'spdx', 'licenseFile']);

    var newEntry = _extends({
        name: name,
        version: version,
        url: url
    }, otherProps);

    var message = '';

    var selectOptions = [];

    console.log('[NEW DEPENDENCY]: ', name + '@' + version + ' not in the curated list');

    if (_lodash2.default.isString(spdx) && _spdx2.default.valid(spdx)) {
        message += '\n\tThe SPDX Expression from package.json is: ' + spdx;
        selectOptions.push({
            name: '[' + spdx + '] (SPDX from package.json)',
            value: { spdx: spdx }
        });
    }

    if (_lodash2.default.isString(guessedLicense) && guessedLicense !== 'UNKNOWN') {
        message += '\n\tThe guessed License is: ' + guessedLicense;
        selectOptions.push({
            name: '[' + guessedLicense + '] (Guessed License)',
            value: { spdx: guessedLicense }
        });
    }

    console.log(message);

    return _inquirer2.default.prompt([{
        type: 'confirm',
        name: 'showFile',
        message: '\tThe module has a license file\nDo you want to see the license file now?',
        when: _lodash2.default.isString(licenseFile)
    }, {
        type: 'list',
        name: 'license',
        message: 'Under which license is ' + name + '@' + version + ' published?',
        when: function when(_ref2) {
            var showFile = _ref2.showFile;

            if (showFile) {
                console.log(licenseFile);
                console.log('----------------------------');
                console.log(name + '@' + version + ' not in the curated list');
                console.log(message);
                console.log('\tThe module has a license file ( see above )');
            }
            return _lodash2.default.size(selectOptions) > 0;
        },
        choices: _lodash2.default.concat(selectOptions, [new _inquirer2.default.Separator(), { name: 'none of the above', value: false }])
    }, {
        type: 'input',
        name: 'license',
        message: 'Please enter an license (preferably in SPDX format)?',
        when: function when(_ref3) {
            var license = _ref3.license;
            return _lodash2.default.isUndefined(license) || license === false;
        },
        filter: function filter(license) {
            if (_lodash2.default.isString(license) && _spdx2.default.valid(license)) {
                return { spdx: license };
            }
            return license;
        }
    }, {
        type: 'input',
        name: 'licenseUrl',
        message: 'Please enter an url to the license',
        when: function when(_ref4) {
            var license = _ref4.license;
            return _lodash2.default.isString(license) || !_spdx2.default.valid(license.spdx);
        }
    }]).then(function (_ref5) {
        var licenseUrl = _ref5.licenseUrl,
            license = _ref5.license;

        if (_lodash2.default.isString(licenseUrl)) {
            newEntry.licenses = [{
                name: license,
                url: licenseUrl
            }];
        } else {
            newEntry.spdx = license.spdx;
        }

        if (_lodash2.default.isString(licenseFile)) {
            newEntry.licenseFile = _lodash2.default.truncate(licenseFile, 120) + ' (rest of the content will be added)';
        }

        if (_lodash2.default.isString(noticeFile)) {
            newEntry.noticeFile = _lodash2.default.truncate(noticeFile, 120) + ' (rest of the content will be added)';
        }

        console.log('---');

        console.log(_jsYaml2.default.safeDump((0, _util.formatDependency)(newEntry), { skipInvalid: true }));

        console.log('---');

        return _inquirer2.default.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'Do you want to add this entry to the curated list?'
        }]);
    }).then(function (_ref6) {
        var confirm = _ref6.confirm;

        if (_lodash2.default.isString(licenseFile)) {
            newEntry.licenseFile = licenseFile;
        }

        if (_lodash2.default.isString(noticeFile)) {
            newEntry.noticeFile = noticeFile;
        }

        return confirm ? { newEntry: newEntry } : { newEntry: false };
    });
};

var dumpFile = function dumpFile(dependencies, _ref7) {
    var location = _ref7.location,
        project = _ref7.project,
        language = _ref7.language,
        description = _ref7.description;

    var result = (0, _util.formatResultObject)(dependencies, {
        title: project,
        description: description,
        language: language
    });

    _fs2.default.writeFileSync(location, _jsYaml2.default.safeDump(result, { skipInvalid: true }), 'utf8');
    (0, _clear2.default)();
    console.log('Wrote changes to', location);
    console.log('\n');
};

/* eslint-disable no-param-reassign */
var curateList = function curateList(_ref8, file) {
    var removed = _ref8.removed,
        added = _ref8.added,
        curatedDependencies = _ref8.curatedDependencies;

    if (_lodash2.default.size(removed) > 0) {
        var deleteCandidate = _lodash2.default.first(removed);
        var name = deleteCandidate.name;

        var replacementCandidates = _lodash2.default.filter(added, { name: name });

        return replacePrompt(deleteCandidate, replacementCandidates).then(function (_ref9) {
            var deleteFromCurated = _ref9.deleteFromCurated,
                replaceWith = _ref9.replaceWith;

            if (deleteFromCurated) {
                curatedDependencies = _lodash2.default.without(curatedDependencies, deleteCandidate);
                added = _lodash2.default.without(added, replaceWith);
            }

            if (replaceWith) {
                replaceWith = _lodash2.default.pick(replaceWith, ['name', 'version']);
                var newEntry = _lodash2.default.chain(deleteCandidate).assign(replaceWith).pick(propsWhitelist).value();

                curatedDependencies = _lodash2.default.concat(curatedDependencies, newEntry);
            }

            removed = _lodash2.default.without(removed, deleteCandidate);

            dumpFile(curatedDependencies, file);

            return curateList({ removed: removed, added: added, curatedDependencies: curatedDependencies }, file);
        });
    }

    if (_lodash2.default.size(added) > 0) {
        var additionCandidate = _lodash2.default.first(added);

        return addPrompt(additionCandidate).then(function (_ref10) {
            var newEntry = _ref10.newEntry;

            if (newEntry) {
                newEntry = _lodash2.default.pick(newEntry, propsWhitelist);
                curatedDependencies = _lodash2.default.concat(curatedDependencies, newEntry);
            }

            added = _lodash2.default.without(added, additionCandidate);

            dumpFile(curatedDependencies, file);

            return curateList({ removed: removed, added: added, curatedDependencies: curatedDependencies }, file);
        });
    }

    return { curatedDependencies: curatedDependencies };
};

/* eslint-enable no-param-reassign */
var consolidate = function consolidate(_ref11) {
    var inputFile = _ref11.inputFile,
        outputFile = _ref11.outputFile;

    var _loadReportFromFile = (0, _util.loadReportFromFile)(inputFile),
        iProject = _loadReportFromFile.project,
        iLanguage = _loadReportFromFile.language,
        iDesc = _loadReportFromFile.description,
        currDependencies = _loadReportFromFile.dependencies;

    var _loadReportFromFile2 = (0, _util.loadReportFromFile)(outputFile, true),
        oProject = _loadReportFromFile2.project,
        oLanguage = _loadReportFromFile2.language,
        oDesc = _loadReportFromFile2.description,
        curatedDependencies = _loadReportFromFile2.dependencies;

    var file = {
        location: outputFile,
        project: oProject || iProject,
        language: oLanguage || iLanguage,
        description: oDesc || iDesc
    };

    var removed = _lodash2.default.differenceBy(curatedDependencies, currDependencies, function (_ref12) {
        var name = _ref12.name,
            version = _ref12.version;
        return name + '@' + version;
    });

    var added = _lodash2.default.differenceBy(currDependencies, curatedDependencies, function (_ref13) {
        var name = _ref13.name,
            version = _ref13.version;
        return name + '@' + version;
    });

    if (_lodash2.default.size(added) + _lodash2.default.size(removed) > 0) {
        console.log('We found ' + _lodash2.default.size(removed) + ' removed and ' + _lodash2.default.size(added) + ' added dependencies in the curated list.');
        _inquirer2.default.prompt([{
            type: 'confirm',
            name: 'start',
            message: 'Do you want to curate the list now?'
        }]).then(function (_ref14) {
            var start = _ref14.start;

            if (start) {
                (0, _clear2.default)();
                return curateList({ removed: removed, added: added, curatedDependencies: curatedDependencies }, file);
            }
            return null;
        });
    } else {
        console.log(inputFile + ' and ' + outputFile + ' contain the same dependencies.');
    }
};

exports.default = function (argv) {
    var args = [{
        name: 'inputFile',
        type: String,
        alias: 'i',
        typeLabel: 'file',
        defaultValue: false,
        description: 'Input file (YAML format, generated by `license-checker report`)'
    }, {
        name: 'outputFile',
        type: String,
        alias: 'o',
        typeLabel: 'file',
        defaultValue: false,
        description: 'Output file (YAML format, does not need to exist)'
    }, { name: 'help', alias: 'h', description: 'Print help', type: Boolean }];

    var options = (0, _commandLineArgs2.default)(args, { argv: argv });

    var help = options.help,
        outputFile = options.outputFile,
        inputFile = options.inputFile;


    if (help) {
        var getUsage = require('command-line-usage');

        var sections = [{
            header: 'Eccenca License Checker (consolidate)',
            content: 'Check if a consolidated report is up to date with a newly generated report.'
        }, {
            header: 'Synopsis',
            content: ['$ license-checker consolidate [--help] --input=<path> --output=<path>']
        }, {
            header: 'Options',
            optionList: args
        }];

        console.log(getUsage(sections));
    } else {
        if (!inputFile) {
            throw new Error('You need to specify an output file');
        }

        if (!outputFile) {
            var mkdirp = require('mkdirp');

            var dir = (0, _path.dirname)(outputFile);
            mkdirp.sync(dir);

            throw new Error('You need to specify an output file');
        }

        consolidate({ inputFile: inputFile, outputFile: outputFile });
    }
};

module.exports = exports['default'];