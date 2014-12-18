var gulp = require('gulp');
var concat = require('gulp-concat');
var filter = require('gulp-filter');
var commonjsWrap = require('gulp-wrap-commonjs');
var sourcemaps = require('gulp-sourcemaps');
var merge = require('merge-stream');
var mainBower = require('main-bower-files');
var sass = require('gulp-ruby-sass');

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
  gulp.src([
    'app/modules/modules.json',
    'app/modules/module-content.json'
    ])
    .pipe(gulp.dest('public/content/'));
});

gulp.task('styles', function() {
  var sassFilter = filter("**/*.scss");
  
  gulp.src([
    'app/**/*.css',
    'app/**/*.scss'
    ])
    .pipe(sourcemaps.init())
    .pipe(sassFilter)
    .pipe(sass())
    .pipe(sassFilter.restore())
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

gulp.task('assets', function() {
  gulp.src('**/assets/**/*')
    .pipe(gulp.dest('public/'));
});


// watch files for changes and reload
gulp.task('serve', function() {
  browserSync({
    server: {
      baseDir: 'public'
    },
    open: false
  });

  // gulp.watch(['*.html', 'app/**/*.css', 'app/**/*.scss', 'app/**/*.js'], {cwd: '.'}, reload);
});


gulp.task('default', ['everfi-sdk', 'vendor', 'assets', 'json', 'scripts', 'styles', 'serve'], function(){
   gulp.watch(["app/**/*.scss", "app/**/*.css"], ['styles']);
   gulp.watch(["app/**/*.js"], ['scripts']);
   gulp.watch(["app/**/*.json"], ['json']);
});
