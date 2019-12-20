const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TSLintPlugin = require('tslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
    entry: {
        examples: './examples/main.ts',
        espSize: "./espSize.ts",
        espTrace: './espTrace.ts',
        onboarding: './onboarding/main.ts',
        menuconfig: "./menuconfig/main.ts",
    },
    output: {
        path: path.resolve(__dirname, '../', '../', 'out', 'views'),
        filename: "[name]-bundle.js",
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
            test: /\.vue$/,
            use: 'vue-loader',
            exclude: /node_modules/
        },
        {
            test: /\.css$/,
            use: [
                'vue-style-loader',
                'css-loader',
            ],
        },
        {
            test: /\.tsx?$/,
            use: {
                loader: "ts-loader",
                options: {
                  appendTsSuffixTo: [/\.vue$/]
                }
            },
            exclude: /node_modules/,
        }]
    },
    resolve: {
        extensions: ['.ts', '.js', '.vue', '.json'],
        alias: {
            'vue$': 'vue/dist/vue.esm.js',
        }
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].bundle.css'
        }),
        new TSLintPlugin({
            files: ['./*.ts']
        }),
        new HtmlWebpackPlugin({
            chunks: ['espSize'],
            filename: "espSize.html",
            template: `${__dirname}/espSize.html`,
            chunks: ['espSize']            
        }),
        new HtmlWebpackPlugin({
            chunks: ['espTrace'],
            filename: "espTrace.html",
            template: `${__dirname}/espTrace.html`,
        }),
        new VueLoaderPlugin(),
    ],
    devServer: {
        contentBase: path.join(__dirname),
        compress: true,
        port: 9000
    }
};
