const path = require('path');
const fs = require('fs');

const should = require('should');

const {yaml2json} = require('../index');

describe('report functions', () => {
    it('successful report', () => {
        const yaml = fs.readFileSync(
            path.join(__dirname, 'assets', 'yaml2json.yml')
        );
        const json = JSON.parse(yaml2json(yaml));

        should(json)
            .be.Array()
            .and.have.length(4);

        should(json[0])
            .have.properties({
                name: '(GPL-2.0 OR MIT)',
                url:
                    'https://raw.githubusercontent.com/faisalman/ua-parser-js/0.7.11/readme.md',
            })
            .and.have.property('pkgs')
            .which.containEql({
                name: 'ua-parser-js',
                url: 'http://github.com/faisalman/ua-parser-js',
            })
            .and.have.length(1);

        should(json[1])
            .have.properties({
                name: 'Apache License 2.0',
                url: 'https://spdx.org/licenses/Apache-2.0.html',
            })
            .and.have.property('pkgs')
            .which.containEql({
                name: 'vis',
                url: 'http://visjs.org/',
            })
            .and.have.length(1);

        should(json[2])
            .have.properties({
                name: 'BSD 3-Clause "New" or "Revised" License',
                url: 'https://spdx.org/licenses/BSD-3-Clause.html',
            })
            .and.have.property('pkgs')
            .which.containEql({
                name: 'warning',
                url: 'https://github.com/BerkeleyTrue/warning',
            })
            .and.have.length(1);

        should(json[3])
            .have.properties({
                name: 'MIT License',
                url: 'https://spdx.org/licenses/MIT.html',
            })
            .and.have.property('pkgs')
            .which.containEql({
                name: 'whatwg-fetch',
                url: 'https://github.com/github/fetch#readme',
            })
            .and.have.length(3);
    });
});
