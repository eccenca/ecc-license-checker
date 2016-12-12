var path = require('path');

module.exports = {
    testEntryPoint: path.join(__dirname, 'test', 'index.js'),
    webpackConfig: {
        production: {
            context: path.resolve(__dirname),
            target: 'node',
            entry: './index.js',
            output: {
                path: path.join(__dirname, 'es5'),
                filename: 'index.js',
                libraryTarget: 'commonjs2',
            },
        },
    },
};
