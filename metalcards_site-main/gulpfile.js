const { src, dest, series, parallel, watch } = require('gulp');
const clean = require('gulp-clean');
const sass = require('gulp-sass')(require('sass'));
const webpack = require('webpack-stream');
const merge = require('merge-stream');
const glob = require('glob');
const path = require('path');


const func = {
  buildJS() {
    var files = glob.sync('./src/**/*.js');
    var pathToSrc = glob.sync('./src')[0];

    return merge(files.map(function(file) {
      return src(file)
        .pipe(webpack({
            entry: {
              [path.basename(file, '.js')]: file
            },
            mode: "production",
            output: {
              filename: '[name].js'
            }
          }))
        .pipe(dest("./static/" + path.relative(pathToSrc, path.dirname(file))))
    }));
  },

  buildDevJS() {
    var files = glob.sync('./src/**/*.js');
    var pathToSrc = glob.sync('./src')[0];

    return merge(files.map(function(file) {
      return src(file)
        .pipe(webpack({
            entry: {
              [path.basename(file, '.js')]: file
            },
            mode: "development",
            output: {
              filename: '[name].js'
            }
          }))
        .pipe(dest("./static/" + path.relative(pathToSrc, path.dirname(file))))
    }));
  },

  buildCSS() {
    return src('src/**/*.scss')
      .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
      .pipe(dest('./static/'))
  },

  clean() {
    return(src("./static/*", {allowEmpty: true}))
      .pipe(clean({force: true}))
  }
}

async function build() {
  series(
    func.clean,
    parallel(
      func.buildJS, 
      func.buildCSS, 
    )
  )();

  await Promise.resolve();
}

async function buildDev() {
  series(
    func.clean,
    parallel(
      func.buildDevJS, 
      func.buildCSS, 
    )
  )();

  watch('src/**/*.js', {delay: 2500}, series(func.buildDevJS));
  watch('src/**/*.scss', {delay: 2500}, series(func.buildCSS));
}

build();

exports.build = build;
exports.buildDev = buildDev;