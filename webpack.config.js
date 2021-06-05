const path = require('path');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const TerserPlugin = require('terser-webpack-plugin')
const nodeExternals = require('webpack-node-externals');


const serverConfig = {
    target: 'node14',
    externals: [nodeExternals()],
    mode: 'production',
    entry: {
        server: './src/server/server.ts',
        consoleui: './src/consoleui/consoleui.ts'
    },
    devtool: 'inline-source-map',
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: 'ts-loader',
            exclude: /node_modules/,
        }, ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            'pty.js': false
        }
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist', 'server'),
        clean: true,
    },
    plugins: [
        new NodePolyfillPlugin(),
        new WebpackManifestPlugin({}),
    ]
};

const clientConfig = {
    //    experiments: {
    //        outputModule: true,
    //    },
    target: ['web'],
    mode: 'production',
    entry: {
        clientlib: './lib/clientlib.ts',
    },
    devtool: 'inline-source-map',
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: 'ts-loader',
            exclude: /node_modules/,
        }, ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist', 'client'),
        clean: true,
        globalObject: 'this',
        //        module: true,
        library: {
            type: 'umd',
            name: '[name]'
        }
    },
    plugins: [
        new WebpackManifestPlugin({}),
        new TerserPlugin({
            parallel: true,
            terserOptions: {
                ecma: 6,
            },
        })
    ]
}

module.exports = [serverConfig, clientConfig]