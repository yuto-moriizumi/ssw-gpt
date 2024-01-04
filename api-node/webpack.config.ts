import path from "path";
import TerserPlugin from "terser-webpack-plugin";
import { lib } from "serverless-webpack";

const isDev = lib.webpack.isLocal;

/**
 * Webpack configuration object.
 * @type {import("webpack").Configuration}
 */
const config = {
  mode: isDev ? "development" : "production",
  target: "node",
  entry: "./main.ts",
  devtool: isDev ? "eval" : undefined,
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
      },
    ],
  },
  optimization: {
    minimize: !isDev,
    minimizer: [new TerserPlugin()],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    libraryTarget: "commonjs2",
    path: path.join(__dirname, ".webpack"),
    filename: "[name].js",
    sourceMapFilename: "[file].map",
  },
};

module.exports = config;
