import should from 'ecc-test-helpers';

import {excludeRepositories, checkDependency} from '../lib/util';

const dependencies = [
    {
        repository: 'https://gitlab.eccenca.com/elds-ui/ecc-mixins'
    },
    {
        name: 'ecc-component-dataintegrationwindow',
        repository: 'ssh://git@gitlab.eccenca.com:8101/elds-ui/ecc-component-dataintegrationwindow'
    },
    {
        repository: 'https://github.com/elds/ecc-mixins'
    },
    {
        repository: 'https://github.com/component/emitter'
    },
    {
        repository: 'ssh:fooo/asd/.git'
    },
    {
        repository: undefined
    },
    {
        repository: false
    },
];

describe('utility functions', () => {
    describe('excludeRepositories', () => {

        const testFn1 = excludeRepositories.bind(null, /(gitlab.eccenca.com)|(github.com\/elds\/)/);
        const testFn2 = excludeRepositories.bind(null, /git@gitlab/);

        it('should exclude eccenca dependencies (gitlab/gh)', () => {
            should(testFn1(dependencies[0])).be.true();
            should(testFn1(dependencies[1])).be.true();
            should(testFn1(dependencies[2])).be.true();
        });
        it('should include non-eccenca dependencies (gitlab/gh)', () => {
            should(testFn1(dependencies[3])).be.false();
            should(testFn1(dependencies[4])).be.false();
        });
        it('should include non strings ', () => {
            should(testFn1(dependencies[5])).be.false();
            should(testFn1(dependencies[6])).be.false();
        });
        it('should work with a custom regex', () => {
            should(testFn2(dependencies[0])).be.false();
            should(testFn2(dependencies[1])).be.true();
            should(testFn2(dependencies[2])).be.false();
            should(testFn2(dependencies[3])).be.false();
            should(testFn2(dependencies[4])).be.false();
        });
    });

    describe('checkDependency', ()=> {

        it('should throw error if a name or version is missing', () => {
            should(function(){checkDependency(dependencies[0])}).throw(Error);
            should(function(){checkDependency(dependencies[1])}).throw(Error);
        })

    });

});

