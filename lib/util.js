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

const getContentsSync = (file) => {
    try {
        const stats = fs.statSync(file);
        if (stats.isFile()) {

            return fs.readFileSync(file, 'utf8');
        }
    } catch (e) {
        console.warn(e, file);
    }
    return false;
};

export const cleanUpDependencies = (dependencies, {regex, warnings, color} = {}) => {

    regex = /(gitlab.eccenca.com)|(github.com\/elds\/)/;

    var additions = [];

    dependencies = _.chain(dependencies)
        .map(validateSPDX)
        .map(getURL)
        .map(({name, version, url, license, licenses, path, repository}) => {

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
                nfc = getContentsSync(noticeFile);
            }

            if (_.isString(licenseFile)) {
                lfc = getContentsSync(licenseFile);
            }

            try {
                var pjson = JSON.parse(getContentsSync(join(path, 'package.json')));

                if (pjson.licenseAdditions) {
                    var additionalLicenses = loadReportFromFile(join(path, pjson.licenseAdditions), true);
                    additions = _.concat(additions, additionalLicenses.dependencies);
                    console.warn(additions);
                }

            } catch (e) {
                console.warn(e);
            }

            return {
                name,
                version,
                spdx: license,
                guessedLicense: licenses,
                licenseFile: lfc,
                noticeFile: nfc,
                url,
                repository,
            };

        })
        .thru(function(value) {
            return _.concat(value, additions)
        })
        .reject(excludeRepositories.bind(null, regex))
        .sortBy('name', 'version')
        .value();

    return dependencies;

};

export const loadReportFromFile = (file, failOkay = false, options = {}) => {

    if (failOkay) {
        try {
            fs.accessSync(file, fs.F_OK);
        } catch (e) {
            const {language = 'javascript', description = 'description', project = 'Project'} = options;
            return {project, language, description, dependencies: []};
        }
    }

    try {
        file = fs.readFileSync(file, 'utf8');
    } catch (e) {
        throw new Error(`Could not load ${file}`);
    }

    return loadReportFromYAML(file);

};

export const loadReportFromYAML = (yamlString) => {
    try {
        yamlString = yaml.load(yamlString, 'utf8');
    } catch (e) {
        throw new Error(`Could not load ${yamlString}`);
    }

    if (_.keys(yamlString) > 1) {
        throw new Error(`${yamlString} should just contain 1 project, it contains ${_.keys(yamlString)}`);
    }

    const project = _.first(_.keys(yamlString));

    const {language, description, dependencies} = _.sample(yamlString);

    return {project, language, description, dependencies};

};
