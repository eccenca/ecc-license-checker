const path = require('path');

const should = require('should');
const _ = require('lodash');

const {report} = require('../index');

describe('report functions', () => {
    it('successful report', done => {
        report(
            {directory: path.join(__dirname, 'assets', 'successful-report')},
            result => {
                const packageNames = _.map(result, 'name');

                should(packageNames)
                    .containEql('package-a')
                    .and.containEql('package-b')
                    .and.containEql('abbrev')
                    .and.containEql('package-license')
                    .and.not.containEql('package-dev')
                    .and.not.containEql('package-eccenca');

                done();
            }
        );
    });
});
