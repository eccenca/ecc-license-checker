import should from 'ecc-test-helpers';

import _ from 'lodash';

import {report} from '../index';
import path from 'path';
describe('report functions', () => {
    it('successful report', (done) => {

        report({directory: path.join(__dirname, 'assets', 'successful-report')}, (result) => {

            const packageNames = _.map(result, 'name');

            (packageNames).should
                .containEql('package-a')
                .and.containEql('package-b')
                .and.containEql('abbrev')
                .and.not.containEql('package-dev');

            done();
        });
    });
});
