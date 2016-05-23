import fs from 'fs';
import {join} from 'path';

import _ from 'lodash';
import spdx from 'spdx';
import yaml from 'js-yaml';




export const formatResultObject = (dependencies, {title, description, language}) => {
    const result = {};

    result[title] = {
        description,
        language,
        dependencies
    };

    return result;
};

export const excludeRepositories = (excludeRepositoryRegex, module) => _.isString(module.repository) && excludeRepositoryRegex.test(module.repository)

export const checkDependency = (module) => {
    const {name, version} = module;
    if (!_.isString(name) || isEmpty(name)) {
        throw new Error('Name is missing');
    }
    if (!_.isString(version) || isEmpty(version)) {
        throw new Error(`Module [${name}]: Version is missing`);
    }
};

export const validateSPDX = (module) => {
    const {license} = module;

    if (_.isString(license) && spdx.valid(license)) {
        module.spdx = license;
    }

    return module;

};

export const getURL = (module) => {

    const {name, homepage, repository} = module;

    let url = homepage || repository;

    if (!_.isString(url) || _.isEmpty(url)) {
        url = `https://www.npmjs.com/package/${name}`;
    }

    module.url = url;

    return module;
};

export const cleanUpDependencies = (dependencies, {regex, warnings, color} = {}) => {

    regex = /(gitlab.eccenca.com)|(github.com\/elds\/)/;

    dependencies = _.chain(dependencies)
        .reject(excludeRepositories.bind(null, regex))
        .map(validateSPDX)
        .map(getURL)
        .map(({name, version, url, license, licenses, path}) => {

            let lfc = false;
            let nfc = false;

            const noticeFile = _.chain(fs.readdirSync(path, 'utf8'))
                .filter((file) => /^notice/i.test(file))
                .map((file) => join(path, file))
                .first()
                .value();


            const licenseFile = _.chain(fs.readdirSync(path, 'utf8'))
                .filter((file) => /^license/i.test(file))
                .map((file) => join(path, file))
                .first()
                .value();

            if (_.isString(noticeFile)) {
                try {
                    const stats = fs.statSync(noticeFile);
                    if (stats.isFile()) {
                        nfc = fs.readFileSync(noticeFile, 'utf8');

                        nfc = `---\n${nfc}`;

                    }
                } catch (e) {
                    console.warn(e, noticeFile);
                }
            }

            if (_.isString(licenseFile)) {
                try {
                    const stats = fs.statSync(licenseFile);
                    if (stats.isFile()) {
                        lfc = fs.readFileSync(licenseFile, 'utf8');
                        lfc = `---\n${lfc}`;
                    }
                } catch (e) {
                    console.warn(e, licenseFile);
                }
            }

            return {
                name,
                version,
                spdx: license,
                guessedLicense: licenses,
                licenseFile: lfc,
                noticeFile: nfc,
                url
            };
        })
        .sortBy('name', 'version')
        .value();

    return dependencies;

};

export const loadReport = (file, failOkay = false, options = {}) => {

    if (failOkay) {
        try {
            fs.accessSync(file, fs.F_OK);
        } catch (e) {
            const {language = 'javascript', description = 'description', project = 'Project'} = options;
            return {project, language, description, dependencies: []};
        }
    }

    try {
        file = yaml.load(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        throw new Error(`Could not load ${file}`);
    }

    if (_.keys(file) > 1) {
        throw new Error(`${file} should just contain 1 project, it contains ${_.keys(file)}`);
    }

    const project = _.first(_.keys(file));

    const {language, description, dependencies} = _.sample(file);

    return {project, language, description, dependencies};

};