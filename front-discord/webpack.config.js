/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

module.exports = () => {
  return {
    mode: process.env.TARGET === "dev" ? "development" : "production",
    watch: process.env.TARGET === "dev",
    devtool: process.env.TARGET === "dev" ? "eval" : undefined,
    target: "node",
    entry: {
      index: "./src/index.ts",
    },
    output: {
      path: path.join(__dirname, "build"),
      filename: "[name].js",
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [{ loader: "ts-loader" }],
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".js"],
    },
  };
};
