const fs = require("fs");
const path = require("path");
const TSLintPlugin = require("tslint-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");

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
  externals: ["commonjs", "vscode"],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "vscode-nls-dev/lib/webpack-loader",
            options: {
              base: path.join(__dirname, "src"),
            },
          },
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
    ],
  },
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
    examples: path.resolve(__dirname, "src", "views", "examples", "main.ts"),
    size: path.resolve(__dirname, "src", "views", "size", "main.ts"),
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
    welcomePage: path.resolve(
      __dirname,
      "src",
      "views",
      "NewWelcome",
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
    extensions: [".ts", ".js", ".vue", ".json"],
    alias: {
      vue$: "vue/dist/vue.esm.js",
    },
    fallback: {
      "os": require.resolve("os-browserify/browser"),
      "path": require.resolve("path-browserify")
    }
  },
  plugins: [
    new TSLintPlugin({
      files: ["./*.ts"],
    }),
    new HtmlWebpackPlugin({
      chunks: ["tracing"],
      filename: "tracing.html",
      template: path.join(__dirname, "src", "views", "tracing", "index.html"),
    }),
    new VueLoaderPlugin(),
  ],
  devServer: {
    contentBase: path.join(__dirname),
    compress: true,
    port: 9000,
  },
};

module.exports = [extensionConfig, webViewConfig];
