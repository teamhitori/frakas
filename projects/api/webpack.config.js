const path = require('path');

module.exports = {
    target: "node",
    entry: {
        api: './src/api.ts'
    },
    mode: 'production',
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
        filename: '[name].js',
        path: path.resolve(__dirname, 'publish')
    },
    plugins: []
};