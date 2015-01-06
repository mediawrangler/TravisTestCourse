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
var fs           = require('fs');
var mainBower    = require('main-bower-files');
var sass         = require('gulp-ruby-sass');
var gulpIf       = require('gulp-if');
var handlebars   = require('gulp-handlebars');
var defineModule = require('gulp-define-module');
var prompt       = require('gulp-prompt');

var browserSync = require('browser-sync');
var reload = browserSync.reload;

// get an array of folders following a pattern from glob search
function getFolderNamesFromSyncGlob(src, pattern) {
  return glob.sync(src)
    .map(function(file) {
      return new RegExp(pattern + '\/([^\/]+)\/.*?$').exec(file)[1];
    })
    .filter(function(value, index, self) {
      return self.indexOf(value) === index;
    });
};

// scaffoldding activity with pages structure
gulp.task('activity', function() {
  gulp.src('.')
    .pipe(prompt.prompt([{
      type: 'input',
      name: 'module',
      message: 'Module name:'
    }, {
      type: 'input',
      name: 'activity',
      message: 'Activity name:'
    }, {
      type: 'input',
      name: 'pages',
      message: 'Number of pages:'
    }], function(res) {
      var activity = './app/modules/' + res.module + '/' + res.activity;
      if (!fs.existsSync(activity)) {
        fs.mkdirSync(activity);
        fs.writeFileSync(activity + '/module.json');
      }
      for(var page = 1; page <= res.pages; page++) {
        var pageDir = activity + '/page-' + page;
        fs.mkdirSync(pageDir);
        fs.mkdirSync(pageDir + '/images');
        fs.mkdirSync(pageDir + '/locales');
        fs.mkdirSync(pageDir + '/locales/en');
        fs.mkdirSync(pageDir + '/templates');
        fs.writeFileSync(pageDir + '/locales/en/i18n.json', '');
        fs.writeFileSync(pageDir + '/_page-' + page + '.scss', '');
        fs.writeFileSync(pageDir + '/page-' + page + '.js', '');
        fs.writeFileSync(pageDir + '/content.json', '');
      }
    }));
})

// scaffolding page structure
gulp.task('page', function() {
  gulp.src('.')
    .pipe(prompt.prompt([{
      type: 'input',
      name: 'module',
      message: 'Module name:'
    }, {
      type: 'input',
      name: 'activity',
      message: 'Activity name:'
    }, {
      type: 'input',
      name: 'page',
      message: 'Page number:'
    }], function(res) {
        var page    = res.page;
        var pageDir = ['./app/modules/', 
          res.module, 
          '/',
          res.activity,
          '/page-' + page
        ].join('');
        fs.mkdirSync(pageDir);
        fs.mkdirSync(pageDir + '/images');
        fs.mkdirSync(pageDir + '/locales');
        fs.mkdirSync(pageDir + '/locales/en');
        fs.mkdirSync(pageDir + '/templates');
        fs.writeFileSync(pageDir + '/locales/en/i18n.json', '');
        fs.writeFileSync(pageDir + '/_page-' + page + '.scss', '');
        fs.writeFileSync(pageDir + '/page-' + page + '.js', '');
        fs.writeFileSync(pageDir + '/content.json', '');
  }));
});


gulp.task('scripts', function() {
  var hbsFilter = filter('**/*.hbs'),
      jsFilter  = filter('**/*.js');
  gulp.src(['app/**/*.js', 'app/**/*.hbs'])
    .pipe(sourcemaps.init())
    .pipe(hbsFilter)
    .pipe(handlebars())
    //.pipe(wrap('Handlebars.template(<%= contents %>)'))
    .pipe(defineModule('commonjs'))
    .pipe(hbsFilter.restore())
    .pipe(gulpIf(/\.js$/, commonjsWrap({
      pathModifier: function(path) {
        return path
          .replace(/^.*?\/app\//, '')
          .replace(/\.js$/, '');
      }
    })))
    .pipe(concat('app.js'))
   // .pipe(sourcemaps.write())
    .pipe(gulp.dest('public/javascripts/'))
    .pipe(reload({stream:true}));
});

gulp.task('json', function() {
  var module  = gulp.src('app/modules/**/module.json')
    .pipe(extend('modules.json'))
    .pipe(gulp.dest('public/content/'));
  
  var content = gulp.src('app/modules/**/content.json')
    .pipe(extend('module-content.json'))
    .pipe(gulp.dest('public/content'));

  merge(module, content); 
});

gulp.task('styles', function() {  
  var modules =  gulp.src(['app/modules/**/*.scss'])
    .pipe(concat('_pages.scss'))
    .pipe(gulp.dest('app/styles'));
  var global = gulp.src(['app/styles/**/*.scss'])
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

  merge(modules, global);
});

gulp.task('everfi-sdk', function() {
  var vendor = gulp.src([
      'bower_components/everfi-sdk/public/!(content|vendor)?**/*',
      'bower_components/everfi-sdk/public/index.html',
    ])
    .pipe(gulp.dest('public/'));
});


gulp.task('vendor', function() {
  var hbs = gulp.src('bower_components/**/*handlebars.js')
    .pipe(gulp.dest('vendor/javascripts'));
  var hbsFilter = filter('**/*/handlebars.js');
  var scripts = gulp.src(['bower_components/**/commonjs-require.js', 'vendor/**/handlebars.js'].concat(mainBower({
      filter: function(file){
        // Want the JS files that are everfi-sdk files
        return file.match(/.*?\.js$/) && !file.match(/everfi-sdk/) && !file.match(/.*?commonjs-require.js$/)
        }
      }), 'vendor/**/*.js'))
      .pipe(hbsFilter)
      .pipe(commonjsWrap({
        pathModifier: function(path) {
          return path
            .replace(/^.*?vendor\/javascripts\/handlebars\/.*?/, '')
            .replace(/\.js$/, '')
        }
       }))
      .pipe(hbsFilter.restore())
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

  merge(hbs, scripts, styles, assets);
});

gulp.task('locales', function() {
  var languages = getFolderNamesFromSyncGlob('app/modules/**/locales/*/*.json', '.*?\/locales');
  var locales   = languages.map(function(lang) {
      return gulp.src('app/modules/**/'+lang+'/*.json')
        .pipe(extend('i18n.json'))
        .pipe(gulp.dest('public/content/locales/'+lang));
    });

    merge.apply(null, locales);
});

gulp.task('assets', function() {
  var assets = gulp.src('**/assets/**/*')
  //.pipe(gulpIf(/.*?\.png$/, optipng()))
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
   gulp.watch(["app/**/*.js", "app/**/*.hbs"], ['scripts']);
   gulp.watch(["app/**/content.json", "app/**/module.json"], ['json']);
   gulp.watch(["app/**/i18n.json"], ['locales']);
});
