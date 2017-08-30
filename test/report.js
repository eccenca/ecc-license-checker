import path from 'path';

import should from 'should';
import _ from 'lodash';

import {report} from '../src/report';

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
                    .and.not.containEql('package-dev');

                done();
            }
        );
    });
});
