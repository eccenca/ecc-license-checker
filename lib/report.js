
import fs from 'fs';
import {join, dirname} from 'path';

import commandLineArgs from 'command-line-args';
import yaml from 'js-yaml';
import checker from 'license-checker';

import {cleanUpDependencies, formatResultObject} from './util';

export const report = ({directory, warnings}, cb) => {

    const pjson = join(directory, 'package.json');
    const nmodules = join(directory, 'node_modules');

    if (!fs.statSync(directory).isDirectory()) {
        throw new Error('input directory is not a directory');
    }
    if (!fs.statSync(pjson).isFile()) {
        throw new Error('input directory does not contain a package.json');
    }
    if (!fs.statSync(nmodules).isDirectory()) {
        throw new Error('input directory does not contain node_modules folder, did you run npm install?');
    }

    checker.init({
        start: directory,
        customFormat: {
            "name": "",
            "version": "",
            "license": false,
            "licenses": false,
            "_resolved": false,
            "repository": false,
            "homepage": false,
            "path": false
        },
        production: true,
        development: false,
        color: false
    }, (err, dependencies) => {

        if (err) {
            throw new Error(err);
        }

        dependencies = cleanUpDependencies(dependencies, {warnings});

        cb(dependencies);

    });

};

export default () => {

    const args = [
        {name: 'help', alias: 'h', description: 'Print help', type: Boolean},
        {
            name: 'directory',
            type: String,
            alias: 'd',
            defaultValue: process.cwd(),
            typeLabel: 'path',
            description: 'Directory from which report will be generated\n(defaults to current working directory)'
        },
        {
            name: 'output',
            type: String,
            alias: 'o',
            defaultValue: false,
            typeLabel: 'path',
            description: 'Output file (otherwise will print to stdout)'
        },
        {name: 'warnings', type: Boolean, defaultValue: true, typeLabel: 'path', description: 'Print warnings'},
        {name: 'title', type: String, defaultValue: 'Project', description: 'Project Title'},
        {name: 'description', type: String, defaultValue: 'Project description', description: 'Project Description'},
        {
            name: 'language',
            type: String,
            defaultValue: 'javascript',
            description: 'Project Language (default: javascript)'
        },
    ];

    const options = commandLineArgs(args);

    if (options.help) {

        var getUsage = require('command-line-usage');

        var sections = [
            {
                header: 'Eccenca License Checker (report)',
                content: 'Generate a license report from a node project with installed dependencies.'
            },
            {
                header: 'Synopsis',
                content: [
                    '$ license-checker report [--help] [--directory[=<path>]] [--output=<path>] [--color] [--warnings] [--title] [--description] [--language]',
                ]
            },
            {
                header: 'Options',
                optionList: args
            },
        ];

        console.log(getUsage(sections));
    } else {

        const {title, description, language} = options;

        report(options, (dependencies) => {

            dependencies = formatResultObject(dependencies, {title, description, language});

            dependencies = yaml.safeDump(dependencies, {skipInvalid: true});

            if (options.output) {
                var path = require('path');
                var mkdirp = require('mkdirp');

                var dir = dirname(options.output);
                mkdirp.sync(dir);
                //Remove the color tags

                fs.writeFileSync(options.output, dependencies, 'utf8');
            } else {
                console.log(dependencies);
            }
        });


    }
}
