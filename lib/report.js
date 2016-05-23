
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
    }, (dependencies, err) => {
        if (err) {
            throw new Error(err);
        }

        dependencies = cleanUpDependencies(dependencies, {warnings});

        cb(dependencies);

    });

};

export default (argv) => {

    var cli = commandLineArgs([
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
        {name: 'help', alias: 'h', description: 'Print help', type: Boolean}
    ]);

    var options = cli.parse(argv);

    if (options.help) {

        var help = {
            title: 'Eccenca License Checker (report)',
            description: 'Generate a license report from a node project with installed dependencies.',
            synopsis: [
                '$ license-checker report [--help] [--directory[=<path>]] ' +
                '[--output=<path>] [--color] [--warnings] ' +
                '[--title] [--description] [--language]'
            ]
        };

        console.log(cli.getUsage(help));
    } else {

        const {title, description, language} = options;

        report(options, (dependencies) => {

            dependencies = formatResultObject(dependencies, {title, description, language});

            dependencies = yaml.dump(dependencies);

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