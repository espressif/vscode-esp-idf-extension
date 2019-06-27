const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TSLintPlugin = require('tslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './espSize.ts',
    output: {
        path: path.resolve(__dirname, '../', '../', 'out', 'views'),
        filename: 'espSize.bundle.js'
    },
    module: {
        rules: [{
            test: /\.scss$/,
            use: [
                MiniCssExtractPlugin.loader,
                {
                    loader: 'css-loader'
                },
                {
                    loader: 'sass-loader',
                    options: {
                        sourceMap: true,
                    }
                }
            ]
        },
        {
            test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
            use: [{
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]',
                    outputPath: 'fonts/'
                }
            }]
        },
        {
            test: /\.tsx?$/,
            use: 'ts-loader',
            exclude: /node_modules/
        },]
    },
    resolve: {
        extensions: ['.ts', '.js', '.vue', '.json'],
        alias: {
            'vue$': 'vue/dist/vue.esm.js'
        }
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'espSize.bundle.css'
        }),
        new TSLintPlugin({
            files: ['./*.ts']
        }),
        new HtmlWebpackPlugin({
            filename: "espSize.html",
            template: `${__dirname}/espSize.html`,
        }),
    ],
    devServer: {
        contentBase: path.join(__dirname),
        compress: true,
        port: 9000
    }
};
