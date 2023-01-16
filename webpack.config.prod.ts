import * as path from 'path';
import * as webpack from 'webpack';
// in case you run into any typescript error when configuring `devServer`
import CopyPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";

const config: webpack.Configuration = {
  mode: 'production',
  context: path.resolve(__dirname, 'src'),
  entry: './index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /.s?css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
    ],
  },
  performance: {
    maxAssetSize: 9000000,
    maxEntrypointSize: 7000000,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: "var",
    library: "ED3DMap",
    clean: true,
  },
  optimization: {
    minimizer: [
      `...`,
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "data", to: "data" },
        { from: "fonts", to: "fonts" },
        { from: "images", to: "images" },
        { from: "textures", to: "textures" },
        { from: "*.html" },
        { from: "*.css" },
      ],
    }),
    new MiniCssExtractPlugin(),
  ],
};

export default config;