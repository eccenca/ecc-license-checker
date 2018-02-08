const fs = require('fs');
const {dirname} = require('path');

const commandLineArgs = require('command-line-args');
const yaml = require('js-yaml');

const {formatResultObject, report} = require('../util');

module.exports = argv => {
    const args = [
        {name: 'help', alias: 'h', description: 'Print help', type: Boolean},
        {
            name: 'directory',
            type: String,
            alias: 'd',
            defaultValue: process.cwd(),
            typeLabel: 'path',
            description:
                'Directory from which report will be generated\n(defaults to current working directory)',
        },
        {
            name: 'output',
            type: String,
            alias: 'o',
            defaultValue: false,
            typeLabel: 'path',
            description: 'Output file (otherwise will print to stdout)',
        },
        {
            name: 'warnings',
            type: Boolean,
            defaultValue: true,
            typeLabel: 'path',
            description: 'Print warnings',
        },
        {
            name: 'title',
            type: String,
            defaultValue: 'Project',
            description: 'Project Title',
        },
        {
            name: 'description',
            type: String,
            defaultValue: 'Project description',
            description: 'Project Description',
        },
        {
            name: 'language',
            type: String,
            defaultValue: 'javascript',
            description: 'Project Language (default: javascript)',
        },
    ];

    const options = commandLineArgs(args, {argv});

    if (options.help) {
        const getUsage = require('command-line-usage');

        const sections = [
            {
                header: 'Eccenca License Checker (report)',
                content:
                    'Generate a license report from a node project with installed dependencies.',
            },
            {
                header: 'Synopsis',
                content: [
                    '$ license-checker report [--help] [--directory[=<path>]] [--output=<path>] [--color] [--warnings] [--title] [--description] [--language]',
                ],
            },
            {
                header: 'Options',
                optionList: args,
            },
        ];

        console.log(getUsage(sections));
    } else {
        const {title, description, language} = options;

        report(options, reportedDependencies => {
            let dependencies = formatResultObject(reportedDependencies, {
                title,
                description,
                language,
            });

            dependencies = yaml.safeDump(dependencies, {skipInvalid: true});

            if (options.output) {
                const mkdirp = require('mkdirp');

                const dir = dirname(options.output);
                mkdirp.sync(dir);
                // Remove the color tags

                fs.writeFileSync(options.output, dependencies, 'utf8');
            } else {
                console.log(dependencies);
            }
        });
    }
};
