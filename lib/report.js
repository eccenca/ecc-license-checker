'use strict';

exports.__esModule = true;
exports.report = undefined;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _commandLineArgs = require('command-line-args');

var _commandLineArgs2 = _interopRequireDefault(_commandLineArgs);

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

var _licenseChecker = require('license-checker');

var _licenseChecker2 = _interopRequireDefault(_licenseChecker);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var report = exports.report = function report(_ref, cb) {
    var directory = _ref.directory,
        warnings = _ref.warnings;

    var pjson = (0, _path.join)(directory, 'package.json');
    var nmodules = (0, _path.join)(directory, 'node_modules');

    if (!_fs2.default.statSync(directory).isDirectory()) {
        throw new Error('input directory is not a directory');
    }
    if (!_fs2.default.statSync(pjson).isFile()) {
        throw new Error('input directory does not contain a package.json');
    }
    if (!_fs2.default.statSync(nmodules).isDirectory()) {
        throw new Error('input directory does not contain node_modules folder, did you run npm install?');
    }

    _licenseChecker2.default.init({
        start: directory,
        customFormat: {
            name: '',
            version: '',
            license: false,
            licenses: false,
            _resolved: false,
            repository: false,
            homepage: false,
            path: false
        },
        production: true,
        development: false,
        color: false
    }, function (err, reportedDependencies) {
        if (err) {
            throw new Error(err);
        }

        var dependencies = (0, _util.cleanUpDependencies)(reportedDependencies, {
            warnings: warnings
        });

        cb(dependencies);
    });
};

exports.default = function (argv) {
    var args = [{ name: 'help', alias: 'h', description: 'Print help', type: Boolean }, {
        name: 'directory',
        type: String,
        alias: 'd',
        defaultValue: process.cwd(),
        typeLabel: 'path',
        description: 'Directory from which report will be generated\n(defaults to current working directory)'
    }, {
        name: 'output',
        type: String,
        alias: 'o',
        defaultValue: false,
        typeLabel: 'path',
        description: 'Output file (otherwise will print to stdout)'
    }, {
        name: 'warnings',
        type: Boolean,
        defaultValue: true,
        typeLabel: 'path',
        description: 'Print warnings'
    }, {
        name: 'title',
        type: String,
        defaultValue: 'Project',
        description: 'Project Title'
    }, {
        name: 'description',
        type: String,
        defaultValue: 'Project description',
        description: 'Project Description'
    }, {
        name: 'language',
        type: String,
        defaultValue: 'javascript',
        description: 'Project Language (default: javascript)'
    }];

    var options = (0, _commandLineArgs2.default)(args, { argv: argv });

    if (options.help) {
        var getUsage = require('command-line-usage');

        var sections = [{
            header: 'Eccenca License Checker (report)',
            content: 'Generate a license report from a node project with installed dependencies.'
        }, {
            header: 'Synopsis',
            content: ['$ license-checker report [--help] [--directory[=<path>]] [--output=<path>] [--color] [--warnings] [--title] [--description] [--language]']
        }, {
            header: 'Options',
            optionList: args
        }];

        console.log(getUsage(sections));
    } else {
        var title = options.title,
            description = options.description,
            language = options.language;


        report(options, function (reportedDependencies) {
            var dependencies = (0, _util.formatResultObject)(reportedDependencies, {
                title: title,
                description: description,
                language: language
            });

            dependencies = _jsYaml2.default.safeDump(dependencies, { skipInvalid: true });

            if (options.output) {
                var mkdirp = require('mkdirp');

                var dir = (0, _path.dirname)(options.output);
                mkdirp.sync(dir);
                // Remove the color tags

                _fs2.default.writeFileSync(options.output, dependencies, 'utf8');
            } else {
                console.log(dependencies);
            }
        });
    }
};