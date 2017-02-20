import _ from 'lodash';
import path from 'path';
import pump from 'pump';
import gutil from 'gulp-util';
import webpack from 'webpack';
import webpackStream from 'webpack-stream';
import WebpackDevServer from 'webpack-dev-server';
// import webpackDevMiddleware from 'webpack-dev-middleware';
// import webpackHotMiddleware from 'webpack-hot-middleware';
// import browserSync from 'browser-sync';
import { createDevConfig, createProdConfig, createWatchConfig } from './webpack.config';
import helper from './webpackHelper';

export default (gulp, options) => {
  if (!webpack) {
    throw new gutil.PluginError('gulp', 'Unable to load "webpack" module.');
  }

  let { type, srcDir, distDir } = options;

  gulp.task('webpack:dev', [`webpack:${type}:dev`]);
  gulp.task('webpack:prod', [`webpack:${type}:prod`]);
  gulp.task('webpack:watch', [`webpack:${type}:watch`]);

  const defaultOptions = {
    type,
    srcDir,
    entry: {
      index: 'index.js'
    },
    outputPath: distDir,
    publicPath: '/',
  };

  let webpackOptions = options.webpack || defaultOptions;

  let loadConfig = (taskName, actualOptions, createConfig) => {
    let { config } = actualOptions;
    if (!config) {
      return createConfig(actualOptions);
    } else if (typeof config === 'string') {
      return require(path.join(process.cwd(), config)).default;
    } else if (typeof config === 'object') {
      return config;
    } else {
      throw new gutil.PluginError(taskName, 'Unknown webpack config: ' + config);
    }
  };

  let runWebpack = (taskName, actualOptions, createConfig, cb) => {
    let { entry, outputPath } = actualOptions;
    if (!entry) {
      // throw new gutil.PluginError(taskName, 'No entry has been found.');
      entry = 'entry.js';
    } else if (typeof entry !== 'string') {
      entry = _.values(entry);
    }

    let config = loadConfig(taskName, actualOptions, createConfig);

    pump([
      gulp.src(entry),
      webpackStream(config, webpack),
      gulp.dest(outputPath || 'dist'),
    ], cb);
  };

  gulp.task(`webpack:${type}:dev`, (cb) => {
    let devOptions = _.defaults({
      entry: webpackOptions.entry,
      outputPath: webpackOptions.devOutputPath || webpackOptions.outputPath,
      publicPath: webpackOptions.publicPath,
      config: webpackOptions.devConfig || webpackOptions.config,
    }, defaultOptions);
    // runWebpack('webpack:dev', devOptions, () => {
    //   return createDevConfig({
    //     getEntry: () => {
    //       return helper.initEntry(devOptions.entry, options.srcDir);
    //     },
    //     getOutputPath: () => {
    //       return path.join(process.cwd(), devOptions.outputPath);
    //     },
    //   });
    // }, cb);
    runWebpack(`webpack:${type}:dev`, devOptions, createDevConfig, cb);
  });

  gulp.task(`webpack:${type}:prod`, (cb) => {
    let isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      gutil.log(gutil.colors.red('NODE_ENV is not "production", which may produce invalid artifacts.'));
    }

    let prodOptions = _.defaults({
      isProd: true,
      entry: webpackOptions.entry,
      outputPath: webpackOptions.prodOutputPath || webpackOptions.outputPath,
      publicPath: webpackOptions.publicPath,
      config: webpackOptions.prodConfig || webpackOptions.config,
    }, defaultOptions);
    runWebpack(`webpack:${type}:prod`, prodOptions, createProdConfig, cb);
  });

  gulp.task(`webpack:${type}:watch`, (cb) => {
    let watchOptions = _.defaults({
      entry: webpackOptions.entry,
      outputPath: webpackOptions.watchOutputPath || webpackOptions.devOutputPath || webpackOptions.outputPath,
      publicPath: webpackOptions.publicPath,
      config: webpackOptions.watchConfig || webpackOptions.devConfig || webpackOptions.config,
      devServer: webpackOptions.devServer,
    }, defaultOptions);
    let { entry, devServer } = watchOptions;
    let config = loadConfig(`webpack:${type}:watch`, watchOptions, createWatchConfig);

    devServer = _.merge({
      host: '0.0.0.0',
      port: 8080,
      hot: true,
      publicPath: watchOptions.publicPath,
    }, devServer);

    config.entry = helper.initEntryForHMR(config.entry, '', devServer);
    let bundler = webpack(config);

    new WebpackDevServer(bundler, devServer).listen(devServer.port, devServer.host, (err) => {
      if (err) {
        throw new gutil.PluginError("webpack-dev-server", err);
      }
      let path = '/index.html';
      if (!_.isEmpty(devServer.index)) {
        path = _.startsWith(devServer.index, '/') ? devServer.index : '/' + devServer.index;
      }
      gutil.log(
        gutil.colors.yellow('[DevServer]'),
        `http://${devServer.host === '0.0.0.0' ? 'localhost' : devServer.host}:${devServer.port}${path}`
      );
    });
  });
}
