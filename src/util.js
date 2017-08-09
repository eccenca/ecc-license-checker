import fs from 'fs';
import {join} from 'path';

import _ from 'lodash';
import {valid as validSPDX} from 'spdx';
import yaml from 'js-yaml';

export const formatDependency = ({
    name,
    version,
    url,
    spdx,
    licenseFile,
    noticeFile,
    ...otherProps
}) => ({
    name,
    version,
    url,
    spdx,
    ...otherProps,
    licenseFile,
    noticeFile,
});

export const formatResultObject = (
    dependencies,
    {title, description, language}
) => {
    const result = {};

    const deps = _.chain(dependencies)
        .filter(_.isObject)
        .sortBy(['name', 'version'])
        .map(formatDependency)
        .value();

    result[title] = {
        description,
        language,
        dependencies: deps,
    };

    return result;
};

export const excludeRepositories = (excludeRepositoryRegex, module) =>
    _.isString(module.repository) &&
    excludeRepositoryRegex.test(module.repository);

export const checkDependency = module => {
    const {name, version} = module;
    if (!_.isString(name) || _.isEmpty(name)) {
        throw new Error('Name is missing');
    }
    if (!_.isString(version) || _.isEmpty(version)) {
        throw new Error(`Module [${name}]: Version is missing`);
    }
};

export const validateSPDX = module => {
    const {license} = module;

    if (_.isString(license) && validSPDX(license)) {
        return {...module, spdx: license};
    }

    return module;
};

export const getURL = module => {
    const {name, homepage, repository} = module;

    let url = homepage || repository;

    if (!_.isString(url) || _.isEmpty(url)) {
        url = `https://www.npmjs.com/package/${name}`;
    }

    return {...module, url};
};

const getContentsSync = file => {
    try {
        const stats = fs.statSync(file);
        if (stats.isFile()) {
            return `---\n${fs.readFileSync(file, 'utf8')}`;
        }
    } catch (e) {
        console.warn(e, file);
    }
    return false;
};

export const cleanUpDependencies = dependencies => {
    const regex = /(gitlab.eccenca.com)|(github.com\/elds\/)/;

    let additions = [];

    return _.chain(dependencies)
        .clone()
        .map(validateSPDX)
        .map(getURL)
        .map(({name, version, url, license, licenses, path, repository}) => {
            let lfc = false;
            let nfc = false;

            const dirList = _.chain(fs.readdirSync(path, 'utf8'));

            const noticeFile = dirList
                .filter(file => /^notice/i.test(file))
                .map(file => join(path, file))
                .first()
                .value();

            const licenseFile = dirList
                .filter(file => /^license/i.test(file))
                .map(file => join(path, file))
                .first()
                .value();

            const additionalLicenses = dirList
                .filter(file => /^additionalLicenses\.yml/i.test(file))
                .map(file => join(path, file))
                .first()
                .value();

            if (_.isString(noticeFile)) {
                nfc = getContentsSync(noticeFile);
            }

            if (_.isString(licenseFile)) {
                lfc = getContentsSync(licenseFile);
            }

            if (_.isString(additionalLicenses)) {
                try {
                    const {
                        dependencies: additionalDependencies,
                    } = loadReportFromFile(additionalLicenses, true);
                    additions = _.concat(additions, additionalDependencies);
                } catch (e) {
                    console.warn(e);
                }
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
        .thru(value => _.concat(value, additions))
        .reject(excludeRepositories.bind(null, regex))
        .sortBy('name', 'version')
        .value();
};

export const loadReportFromFile = (file, failOkay = false, options = {}) => {
    if (failOkay) {
        try {
            fs.accessSync(file, fs.F_OK);
        } catch (e) {
            const {
                language = 'javascript',
                description = 'description',
                project = 'Project',
            } = options;
            return {project, language, description, dependencies: []};
        }
    }

    let report;

    try {
        report = fs.readFileSync(file, 'utf8');
    } catch (e) {
        throw new Error(`Could not load ${file}`);
    }

    return loadReportFromYAML(report);
};

export const loadReportFromYAML = yamlString => {
    let yamlData;
    try {
        yamlData = yaml.load(yamlString, 'utf8');
    } catch (e) {
        throw new Error(`Could not load ${yamlString}`);
    }

    if (_.keys(yamlData) > 1) {
        throw new Error(
            `${yamlData} should just contain 1 project, it contains ${_.keys(
                yamlData
            )}`
        );
    }

    const project = _.first(_.keys(yamlData));

    const {language, description, dependencies} = _.sample(yamlData);

    return {project, language, description, dependencies};
};
