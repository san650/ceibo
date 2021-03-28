const path = require('path');

module.exports = {
    entry: './src/index.js',
    mode: 'production',
    output: {
        path: path.resolve(__dirname, '.'),
        filename: 'index.js',

        library: {
            name: 'Ceibo',

            type: 'umd',
        },

        libraryExport: "default",

        // Fix for node.js environment
        // see https://github.com/webpack/webpack/issues/6784#issuecomment-610090526      
        globalObject: 'typeof self !== \'undefined\' ? self : this',
    },
};