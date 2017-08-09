# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/) and [Keep A Changelog's Format](http://keepachangelog.com/).

## [Unreleased]

### Changed
- Update spdx license list to version 2.6

## [2.5.2] 2017-01-11
### Fixed
- `consolidate` allows downloadUrl and copies all fields if possible from input file
- `yaml2json` now converts yaml correctly to json

## [2.5.1] 2016-12-12
### Fixed
- yaml dumps are now sorted in a fixed order:
```yaml
DataManager:
  description: ...
  language: ...
  dependencies:
    - name: argparse
      version: 1.0.9
      url: 'https://github.com/nodeca/argparse'
      spdx: MIT
      # OtherProperties
      licenseFile: ...
      noticeFile: ...
```

## [2.5.0] 2016-12-12
### Changed
- yaml dumps are now always sorted alphabetically

## [2.4.2] 2016-12-12
### Fixed
- Licenses with leading whitespaces will no be reported correctly

## [2.4.1] 2016-12-12
### Fixed
- Fix consolidate command

## [2.4.0] 2016-12-12
### Added
- possibility to provide a `additionalLicenses.yml` file which will be merged into the report

### Changed
- Updated dependencies
- Bumped spdx list to version 2.5
