const fs = require("fs");
const path = require("path");
const { VueLoaderPlugin } = require("vue-loader");
const webpack = require("webpack");
const fileManagerPlugin = require("filemanager-webpack-plugin");

const packageConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
);
const externals = Object.keys(packageConfig.dependencies);
externals.push("commonjs");
externals.push("vscode");

const extensionConfig = {
  entry: {
    extension: path.resolve(__dirname, "src", "extension.ts"),
    kconfigServer: path.resolve(__dirname, "src", "kconfig", "server.ts"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  target: "node",
  node: {
    __dirname: false,
    __filename: true,
  },
  devtool: "source-map",
  externals: [
    "commonjs",
    "vscode",
    "applicationinsights-native-metrics",
    "bufferutil",
    "utf-8-validate",
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              compilerOptions: {
                module: "es6",
              },
            },
          },
        ],
      },
      {
        test: /node-gyp-build\.js$/,
        loader: "string-replace-loader",
        options: {
          search: /path\.join\(dir, 'prebuilds'/g,
          replace: "path.join(__dirname, 'prebuilds'",
        },
      },
      {
        // Fix axios navigator deprecation warning in VS Code 1.101+ (Node.js v22)
        // Replace navigator access with undefined for Node.js environment
        test: /node_modules\/axios\/lib\/platform\/common\/utils\.js$/,
        loader: "string-replace-loader",
        options: {
          search: /const _navigator = typeof navigator === 'object' && navigator \|\| undefined;/g,
          replace: "const _navigator = undefined; // Replaced to avoid navigator deprecation warning in Node.js v22",
        },
      },
    ],
  },
  plugins: [
    new fileManagerPlugin({
      events: {
        onEnd: {
          copy: [
            {
              source: path.resolve(
                __dirname,
                "./node_modules/@serialport/bindings-cpp/prebuilds"
              ),
              destination: path.resolve(__dirname, "./dist/prebuilds"),
            },
          ],
        },
      },
    }),
  ],
  resolve: {
    extensions: [".js", ".ts"],
  },
};

const webViewConfig = {
  entry: {
    cmakelistsEditor: path.resolve(
      __dirname,
      "src",
      "views",
      "cmakelists-editor",
      "main.ts"
    ),
    size: path.resolve(__dirname, "src", "views", "size", "main.ts"),
    newSize: path.resolve(__dirname, "src", "views", "newSize", "main.ts"),
    tracing: path.resolve(__dirname, "src", "views", "tracing", "main.ts"),
    menuconfig: path.resolve(
      __dirname,
      "src",
      "views",
      "menuconfig",
      "main.ts"
    ),
    setup: path.resolve(__dirname, "src", "views", "setup", "main.ts"),
    nvsPartitionTable: path.resolve(
      __dirname,
      "src",
      "views",
      "nvs-partition-table",
      "main.ts"
    ),
    newProject: path.resolve(
      __dirname,
      "src",
      "views",
      "new-project",
      "main.ts"
    ),
    sysView: path.resolve(__dirname, "src", "views", "system-view", "main.ts"),
    partition_table: path.resolve(
      __dirname,
      "src",
      "views",
      "partition-table",
      "main.ts"
    ),
    project_conf: path.resolve(
      __dirname,
      "src",
      "views",
      "project-conf",
      "main.ts"
    ),
    welcomePage: path.resolve(__dirname, "src", "views", "welcome", "main.ts"),
    troubleshoot: path.resolve(
      __dirname,
      "src",
      "views",
      "troubleshoot",
      "main.ts"
    ),
  },
  output: {
    path: path.resolve(__dirname, "dist", "views"),
    filename: "[name]-bundle.js",
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          {
            loader: "vue-style-loader",
          },
          {
            loader: "css-loader",
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "fonts",
            },
          },
        ],
      },
      {
        test: /\.vue$/,
        use: "vue-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["vue-style-loader", "css-loader"],
      },
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            appendTsSuffixTo: [/\.vue$/],
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    conditionNames: ["import"],
    extensions: [".ts", ".js", ".vue", ".json"],
    alias: {
      Vue: "vue/dist/vue.esm-bundler.js",
    },
    fallback: {
      os: require.resolve("os-browserify/browser"),
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
      assert: require.resolve("assert/"),
    },
  },
  plugins: [
    new VueLoaderPlugin(),
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false,
    }),
  ],
  devServer: {
    contentBase: path.join(__dirname),
    compress: true,
    port: 9000,
  },
};

module.exports = [extensionConfig, webViewConfig];
