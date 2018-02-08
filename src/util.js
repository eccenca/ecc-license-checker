const fs = require('fs');
const {join} = require('path');

const _ = require('lodash');
const validSPDX = require('spdx').valid;
const yaml = require('js-yaml');
const checker = require('license-checker');
const {spdxLicenseList} = require('./spdx-list');

const formatDependency = dependency => {
    const {
        name,
        version,
        url,
        spdx,
        licenseFile,
        noticeFile,
        // ...otherProps
    } = dependency;

    return _.extend(
        {},
        {
            name,
            version,
            url,
            spdx,
        },
        _.omit(dependency, [
            'name',
            'version',
            'url',
            'licenseFile',
            'noticeFile',
        ]),
        {
            licenseFile,
            noticeFile,
        }
    );
};

const formatResultObject = (dependencies, {title, description, language}) => {
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

const excludeRepositories = (excludeRepositoryRegex, module) => {
    const repository = _.get(module, 'repository.url', module.repository);

    return _.isString(repository) && excludeRepositoryRegex.test(repository);
};

const checkDependency = module => {
    const {name, version} = module;
    if (!_.isString(name) || _.isEmpty(name)) {
        throw new Error('Name is missing');
    }
    if (!_.isString(version) || _.isEmpty(version)) {
        throw new Error(`Module [${name}]: Version is missing`);
    }
};

const validateSPDX = module => {
    const {license} = module;

    if (_.isString(license) && validSPDX(license)) {
        return _.extend({}, module, {spdx: license});
    }

    return module;
};

const getURL = module => {
    const {name, homepage, repository} = module;

    let url = homepage || _.get(repository, 'url', repository);

    if (!_.isString(url) || _.isEmpty(url)) {
        url = `https://www.npmjs.com/package/${name}`;
    }

    return _.extend({}, module, {url});
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

const cleanUpDependencies = dependencies => {
    const regex = /(gitlab.eccenca.com)|(github.com\/elds\/)|(github.com\/eccenca\/)/;

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
                .filter(file => /^(notice|patent)/i.test(file))
                .map(file => join(path, file))
                .first()
                .value();

            const licenseFile = dirList
                .filter(file => /^(license|copying)/i.test(file))
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

const loadReportFromFile = (file, failOkay = false, options = {}) => {
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

const loadReportFromYAML = yamlString => {
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

const report = ({directory, warnings}, cb) => {
    const pjson = join(directory, 'package.json');
    const nmodules = join(directory, 'node_modules');

    if (!fs.statSync(directory).isDirectory()) {
        throw new Error('input directory is not a directory');
    }
    if (!fs.statSync(pjson).isFile()) {
        throw new Error('input directory does not contain a package.json');
    }
    if (!fs.statSync(nmodules).isDirectory()) {
        throw new Error(
            'input directory does not contain node_modules folder, did you run npm install?'
        );
    }

    checker.init(
        {
            start: directory,
            customFormat: {
                name: '',
                version: '',
                license: false,
                licenses: false,
                _resolved: false,
                repository: false,
                homepage: false,
                path: false,
            },
            production: true,
            development: false,
            color: false,
        },
        (err, reportedDependencies) => {
            if (err) {
                throw new Error(err);
            }

            const dependencies = cleanUpDependencies(reportedDependencies, {
                warnings,
            });

            cb(dependencies);
        }
    );
};

const groupDependencies = dependencies =>
    _.chain(dependencies)
        .reduce((result, x) => {
            const {spdx = false, licenses, name, url} = x;
            let licenseUrl;
            let licenseName;

            if (!spdx || _.startsWith(spdx, '(')) {
                licenseName = _.first(licenses).name;
                licenseUrl = _.first(licenses).url;
            } else if (_.startsWith(spdx, '(')) {
                licenseName = spdx;
                licenseUrl = _.first(licenses).url;
            } else {
                licenseName = _.find(spdxLicenseList, {licenseId: spdx}).name;
                licenseUrl = `https://spdx.org/licenses/${spdx}.html`;
            }

            if (!_.has(result, licenseName)) {
                _.set(result, licenseName, {
                    name: licenseName,
                    url: licenseUrl,
                    pkgs: [],
                });
            }

            let pkgs = _.get(result, [licenseName, 'pkgs']);

            pkgs = _.chain(pkgs)
                .concat({name, url})
                .sortBy('name')
                .uniqBy('name')
                .value();

            _.set(result, [licenseName, 'pkgs'], pkgs);

            return result;
        }, {})
        .values()
        .sortBy(['name'])
        .value();

const yaml2json = yamlString => {
    let {dependencies} = loadReportFromYAML(yamlString);
    dependencies = groupDependencies(dependencies);
    return JSON.stringify(dependencies);
};

module.exports = {
    loadReportFromFile,
    checkDependency,
    excludeRepositories,
    formatResultObject,
    formatDependency,
    report,
    yaml2json,
    groupDependencies,
};
