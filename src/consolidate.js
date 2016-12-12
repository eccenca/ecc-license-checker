import fs from 'fs';
import {dirname} from 'path';

import _ from 'lodash';
import yaml from 'js-yaml';
import clear from 'clear';
import spdxCheck from 'spdx';
import Table from 'cli-table';
import commandLineArgs from 'command-line-args';

import inquirer from 'inquirer';

const propsWhitelist = ['name', 'version', 'url', 'spdx', 'licenses', 'notices', 'noticeFile', 'licenseFile'];

import {loadReportFromFile, formatResultObject} from './util';

const replacePrompt = (deleteCandidate, replacementCandidates) => {

    const {name, version, licenses = '---', spdx = '---', licenseFile = '---'} = deleteCandidate;

    let choices = [
        {name: 'Delete from curated list', value: true},
        {name: 'Keep on curated list', value: false}
    ];

    console.log(`[OBSOLETE DEPENDENCY]: ${name}@${version} not found within the dependencies`);

    if (_.size(replacementCandidates) > 0) {

        choices.push(new inquirer.Separator());

        console.log(`There may be suitable replacements:`);

        const table = new Table({head: ['', 'SPDX', 'License', 'License File'], colWidths: [35, 30, 30, 100]});

        let row = {};

        row[`Curr: ${name}@${version}`] = [`${spdx}`, `${licenses}`, `${licenseFile}`];

        table.push(row);

        _.forEach(replacementCandidates, (x) => {

            const {name, version, guessedLicense, spdx = '---', licenseFile = '---'} = x;

            row = {};

            row[`New: ${name}@${version}`] = [`${spdx}`, `Guessed: ${guessedLicense}`, `${licenseFile}`];

            table.push(row);

            choices.push({name: `Bump version to ${version} (DO ONLY IF LICENSE DID NOT CHANGE)`, value: x});

        });

        console.log(table.toString());

    }

    return inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What do you want to do?',
            default: true,
            choices
        }])
        .then(({action}) => {
            if (_.isBoolean(action)) {
                return {deleteFromCurated: action};
            }
            return {deleteFromCurated: true, replaceWith: action}
        });
};

const addPrompt = (additionCandidate) => {

    const {name, version, url, noticeFile, guessedLicense = '---', spdx = '---', licenseFile = false} = additionCandidate;

    const newEntry = {
        name,
        version,
        url
    };

    var message = '';

    var selectOptions = [];

    console.log('[NEW DEPENDENCY]: ', `${name}@${version} not in the curated list`);

    if ((_.isString(spdx) && spdxCheck.valid(spdx))) {
        message += `\n\tThe SPDX Expression from package.json is: ${spdx}`;
        selectOptions.push({name: `[${spdx}] (SPDX from package.json)`, value: {spdx}});
    }

    if ((_.isString(guessedLicense) && guessedLicense !== 'UNKNOWN')) {
        message += `\n\tThe guessed License is: ${guessedLicense}`;
        selectOptions.push({name: `[${guessedLicense}] (Guessed License)`, value: {spdx: guessedLicense}});
    }

    console.log(message);

    return inquirer.prompt([
        {
            type: 'confirm',
            name: 'showFile',
            message: `\tThe module has a license file\nDo you want to see the license file now?`,
            when: _.isString(licenseFile)
        },
        {
            type: 'list',
            name: 'license',
            message: `Under which license is ${name}@${version} published?`,
            when: ({showFile}) => {
                if (showFile) {
                    console.log(licenseFile);
                    console.log('----------------------------');
                    console.log(`${name}@${version} not in the curated list`);
                    console.log(message);
                    console.log(`\tThe module has a license file ( see above )`);
                }
                return _.size(selectOptions) > 0
            }
            ,
            choices: _.concat(selectOptions, [
                new inquirer.Separator(),
                {name: `none of the above`, value: false}
            ])
        },
        {
            type: 'input',
            name: 'license',
            message: `Please enter an license (preferably in SPDX format)?`,
            when: ({license}) => {
                return _.isUndefined(license) || license === false;
            },
            filter: (license) => {
                if (_.isString(license) && spdxCheck.valid(license)) {
                    return {spdx: license};
                }
                return license;
            }
        },
        {
            type: 'input',
            name: 'licenseUrl',
            message: 'Please enter an url to the license',
            when: ({license}) => _.isString(license) || !spdxCheck.valid(license.spdx)
        }
    ])
        .then(({licenseUrl, license}) => {

            if (_.isString(licenseUrl)) {
                newEntry.licenses = [{
                    name: license,
                    url: licenseUrl
                }];
            } else {
                newEntry.spdx = license.spdx;
            }

            if (_.isString(licenseFile)) {
                newEntry.licenseFile = _.truncate(licenseFile, 120) + ' (rest of the content will be added)';
            }

            if (_.isString(noticeFile)) {
                newEntry.noticeFile = _.truncate(noticeFile, 120) + ' (rest of the content will be added)';
            }

            console.log('---');

            console.log(yaml.safeDump(newEntry, {skipInvalid: true, sortKeys: true}));

            console.log('---');

            return inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: `Do you want to add this entry to the curated list?`
            }]);
        })
        .then(({confirm}) => {

            if (_.isString(licenseFile)) {
                newEntry.licenseFile = licenseFile;
            }

            if (_.isString(noticeFile)) {
                newEntry.noticeFile = noticeFile;
            }

            return confirm ? {newEntry} : {newEntry: false};
        })
        ;

};

const dumpFile = (dependencies, {location, project, language, description}) => {

    const result = formatResultObject(dependencies, {title: project, description, language});

    fs.writeFileSync(location, yaml.safeDump(result, {skipInvalid: true}), 'utf8');
    clear();
    console.log('Wrote changes to', location);
    console.log('\n');
};

const curateList = ({removed, added, curatedDependencies}, file)=> {


    if (_.size(removed) > 0) {

        const deleteCandidate = _.first(removed);
        const {name} = deleteCandidate;
        const replacementCandidates = _.filter(added, {name});

        return replacePrompt(deleteCandidate, replacementCandidates)
            .then(({deleteFromCurated, replaceWith}) => {
                if (deleteFromCurated) {
                    curatedDependencies = _.without(curatedDependencies, deleteCandidate);
                    added = _.without(added, replaceWith);
                }

                if (replaceWith) {
                    replaceWith = _.pick(replaceWith, ['name', 'version']);
                    const newEntry = _.chain(deleteCandidate)
                        .assign(replaceWith)
                        .pick(propsWhitelist)
                        .value();

                    curatedDependencies = _.concat(curatedDependencies, newEntry);
                }

                removed = _.without(removed, deleteCandidate);

                dumpFile(curatedDependencies, file);

                return curateList({removed, added, curatedDependencies}, file);

            });
    }

    if (_.size(added) > 0) {

        const additionCandidate = _.first(added);

        return addPrompt(additionCandidate)
            .then(({newEntry}) => {


                if (newEntry) {
                    newEntry = _.pick(newEntry, propsWhitelist);
                    curatedDependencies = _.concat(curatedDependencies, newEntry);
                }

                added = _.without(added, additionCandidate);

                dumpFile(curatedDependencies, file);

                return curateList({removed, added, curatedDependencies}, file);
            });

    }

    return {curatedDependencies};

};

const consolidate = ({inputFile, outputFile}) => {

    const {project: iProject, language: iLanguage, description: iDesc, dependencies: currDependencies} = loadReportFromFile(inputFile);

    const {project: oProject, language: oLanguage, description: oDesc, dependencies: curatedDependencies} = loadReportFromFile(outputFile, true);

    const file = {
        location: outputFile,
        project: oProject || iProject,
        language: oLanguage || iLanguage,
        description: oDesc || iDesc
    };

    const removed = _.differenceBy(curatedDependencies, currDependencies, ({name, version}) => `${name}@${version}`);

    const added = _.differenceBy(currDependencies, curatedDependencies, ({name, version}) => `${name}@${version}`);

    if ((_.size(added) + _.size(removed)) > 0) {
        console.log(`We found ${_.size(removed)} removed and ${_.size(added)} added dependencies in the curated list.`);
        inquirer.prompt([{
            type: 'confirm',
            name: 'start',
            message: `Do you want to curate the list now?`
        }]).then(({start}) => {
            if (start) {
                clear();
                return curateList({removed, added, curatedDependencies}, file)
            }
        });
    } else {
        console.log(`${inputFile} and ${outputFile} contain the same dependencies.`)
    }


};

export default () => {

    var args = [
        {
            name: 'inputFile',
            type: String,
            alias: 'i',
            typeLabel: 'file',
            defaultValue: false,
            description: 'Input file (YAML format, generated by `license-checker report`)'
        },
        {
            name: 'outputFile',
            type: String,
            alias: 'o',
            typeLabel: 'file',
            defaultValue: false,
            description: 'Output file (YAML format, does not need to exist)'
        },
        {name: 'help', alias: 'h', description: 'Print help', type: Boolean}
    ];

    var options = commandLineArgs(args);

    var {help, outputFile, inputFile} = options;

    if (help) {

        var getUsage = require('command-line-usage');

        var sections = [
            {
                header: 'Eccenca License Checker (consolidate)',
                content: 'Check if a consolidated report is up to date with a newly generated report.'
            },
            {
                header: 'Synopsis',
                content: [
                    '$ license-checker consolidate [--help] --input=<path> --output=<path>',
                ]
            },
            {
                header: 'Options',
                optionList: args
            },
        ];

        console.log(getUsage(sections));

    } else {

        if (!inputFile) {
            throw new Error('You need to specify an output file');
        }

        if (!outputFile) {
            var mkdirp = require('mkdirp');

            var dir = dirname(outputFile);
            mkdirp.sync(dir);

            throw new Error('You need to specify an output file');
        }

        consolidate({inputFile, outputFile})

    }
}
