const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');

module.exports = {
    target: "node",
    devtool: 'inline-source-map',
    entry: {
        app: './src/api.ts'
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.ttf$/,
                use: ['file-loader']
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        fallback: {
            "fs": false,
            "tls": false,
            "net": false,
            "path": false,
            "zlib": false,
            "http": false,
            "http2": false,
            "https": false,
            "stream": false,
            "crypto": false,
            "util": false,
            "url": false,
            "assert": false,
            "os": false
        }
    },
    output: {
        globalObject: 'self',
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    plugins: []
};