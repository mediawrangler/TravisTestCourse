var gulp         = require('gulp');
var concat       = require('gulp-concat');
var filter       = require('gulp-filter');
var compass      = require('gulp-compass');
var commonjsWrap = require('gulp-wrap-commonjs');
var sourcemaps   = require('gulp-sourcemaps');
var merge        = require('merge-stream');
var extend       = require('gulp-extend');
var wrap         = require('gulp-wrap');
var glob         = require('glob');
var mainBower    = require('main-bower-files');
var sass         = require('gulp-ruby-sass');

var browserSync = require('browser-sync');
var reload = browserSync.reload;

gulp.task('scripts', function() {
  gulp.src('app/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(commonjsWrap())
    .pipe(concat('app.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('public/javascripts/'))
    .pipe(reload({stream:true}));
});

gulp.task('json', function() {
  var module  = gulp.src('app/modules/modules.json')
    .pipe(gulp.dest('public/content/'));
  
  var content = gulp.src('app/modules/**/content.json')
    .pipe(extend('module-content.json'))
    .pipe(gulp.dest('public/content'));

  merge(module, content); 
});

gulp.task('styles', function() {  
  gulp.src(['app/**/*.scss'])
    .pipe(sourcemaps.init())
    .pipe(compass({
      config_file: './config/compass.rb',
      css: 'stylesheets',
      sass: 'app/styles',
      images: 'images'
    }))
    .pipe(concat('app.css'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('public/stylesheets/'))
    .pipe(reload({stream:true}));
});

gulp.task('everfi-sdk', function() {
  var vendor = gulp.src([
      'bower_components/everfi-sdk/public/!(content|vendor)?**/*',
      'bower_components/everfi-sdk/public/index.html'
    ])
    .pipe(gulp.dest('public/'));
});


gulp.task('vendor', function() {
  var scripts = gulp.src( mainBower({
      filter: function(file){
        // Want the JS files that are everfi-sdk files
        return file.match(/js$/) && !file.match(/everfi-sdk/);
        }
      }))
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('public/javascripts/'));

  var styles = gulp.src( mainBower({
      filter: function(file){
        // Want the CSS files that are everfi-sdk files
        return file.match(/css$/) && !file.match(/everfi-sdk/);
        }
      }))
    .pipe(concat('vendor.css'))
    .pipe(gulp.dest('public/stylesheets/'));

  var assets = gulp.src( mainBower({
      filter: function(file){
        return file.match(/(png|html|jpg|jpeg|woff|map)$/i) && !file.match(/everfi-sdk/);
      }
      }))
    .pipe(gulp.dest('public/'));

  merge(scripts, styles, assets);
});

gulp.task('locales', function() {
  var locales = glob.sync('app/modules/**/locales/*/*.json')
  // map and return a list of the unique languages
    .map(function(file) {
      return /.*?\/locales\/([^\/]+)\/.*?\.json$/.exec(file)[1];
    })
    .filter(function(value, index, self) {
      return self.indexOf(value) === index;
    })
  // turn this into an array of streams per language
    .map(function(lang) {
      return gulp.src('app/modules/**/'+lang+'/*.json')
        .pipe(extend('i18n.json'))
        .pipe(gulp.dest('public/content/locales/'+lang));
    });

    merge.apply(null, locales);
});

gulp.task('assets', function() {
  var assets = gulp.src('**/assets/**/*')
    .pipe(gulp.dest('public/'));
  var moduleImages = gulp.src('app/modules/**/images/*')
    .pipe(gulp.dest('public/images'));
  merge(assets, moduleImages);
});


// watch files for changes and reload
gulp.task('serve', function() {
  browserSync({
    server: {
      baseDir: 'public'
    },
    open: false
  });
});

gulp.task('default', ['everfi-sdk', 'vendor', 'locales', 'json', 'assets', 'scripts', 'styles', 'serve'], function(){
   gulp.watch(["app/**/*.scss", "app/**/*.css"], ['styles']);
   gulp.watch(["app/**/images/*"], ['assets']);
   gulp.watch(["app/**/*.js"], ['scripts']);
   gulp.watch(["app/**/content.json"], ['json']);
   gulp.watch(["app/**/i18n.json"], ['locales']);
});