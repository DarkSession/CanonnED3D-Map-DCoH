import * as path from 'path';
import * as webpack from 'webpack';
// in case you run into any typescript error when configuring `devServer`
import 'webpack-dev-server';
import CopyPlugin from "copy-webpack-plugin";

const config: webpack.Configuration = {
  mode: 'production',
  context: path.resolve(__dirname, 'src'),
  entry: './index.ts',
  devtool: 'inline-source-map',
  devServer: {
    static: './dist',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      /*
      {
        // Exposes jQuery for use outside Webpack build
        test: require.resolve('jquery'),
        use: [{
          loader: 'expose-loader',
          options: 'jQuery'
        }, {
          loader: 'expose-loader',
          options: '$'
        }]
      }
      */
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
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "data", to: "data" },
        { from: "fonts", to: "fonts" },
        { from: "textures", to: "textures" },
        { from: "*.html" },
        { from: "*.css" },
      ],
    }),
  ],
};

export default config;