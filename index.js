
import reportCMD from './lib/report';
import consolidateCMD from './lib/consolidate';
import yaml2jsonCMD from './lib/yaml2json';

const commands = {
    reportCMD,
    consolidateCMD,
    yaml2jsonCMD
};

export report from './lib/report';

export {yaml2json} from './lib/yaml2json';

export {spdxLicenseList} from './lib/spdx-list';

export {commands};