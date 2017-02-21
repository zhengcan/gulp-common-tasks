// Modules
import moduleHelp from './help';
import moduleLib from './lib';
import moduleDist from './dist';
import moduleWatch from './watch';
import moduleWebpack from './webpack';
import moduleLint from './lint';
import moduleSubProject from './subproject';

// Dependencies
import _ from 'lodash';
import pump from 'pump';
import gutil from 'gulp-util';

// Default options
const DEFAULT_OPTIONS = {
  type: 'web',    // 'web' or 'lib'
  srcDir: './src/',
  libDir: './lib/',
  distDir: './dist/',
};

export default function registryTasks(gulp, options) {
  options = _.merge(DEFAULT_OPTIONS, options);
  let { type, srcDir } = options;

  let src = (globs, options) => {
    if (typeof globs === 'array') {
      return gulp.src(_.map(globs, l => srcDir + l), options);
    } else {
      return gulp.src(srcDir + globs, options);
    }
  };
  let dest = (globs, options) => {
    if (typeof globs === 'array') {
      return gulp.dest(_.map(globs, l => l), options);
    } else {
      return gulp.dest(globs, options);
    }
  };
  let watch = (globs, options, tasksOrCb) => {
    if (typeof globs === 'array') {
      return gulp.watch(_.map(globs, l => srcDir + l), options, tasksOrCb);
    } else {
      return gulp.watch(srcDir + globs, options, tasksOrCb);
    }
  };

  let enhancedGulp = {
    src, dest, watch,
    tasks: gulp.tasks,
    task: (...args) => {
      return gulp.task(...args);
    }
  };

  // import taskListing from 'gulp-task-listing';
  // let taskListing = require('gulp-task-listing');
  // gulp.task('help', taskListing);

  gulp.task('build:all', ['build:lib', 'build:dist']);
  if (type === 'web') {
    gulp.task('build:dev', ['build:lib', 'webpack:dev']);
    gulp.task('build:prod', ['webpack:prod']);
  } else if (type === 'lib') {
    gulp.task('build:dev', ['build:lib', 'webpack:dev']);
    gulp.task('build:prod', ['webpack:prod']);
  }

  moduleHelp(enhancedGulp, options);
  moduleLib(enhancedGulp, options);
  moduleDist(enhancedGulp, options);
  moduleWatch(enhancedGulp, options);
  moduleWebpack(enhancedGulp, options);
  moduleLint(enhancedGulp, options);
  moduleSubProject(enhancedGulp, options);
}
