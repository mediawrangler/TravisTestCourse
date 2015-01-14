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
var gulpIf       = require('gulp-if');
var mainBower    = require('main-bower-files');
var sass         = require('gulp-ruby-sass');
var handlebars   = require('gulp-handlebars');
var defineModule = require('gulp-define-module');
var prompt       = require('gulp-prompt');

var browserSync = require('browser-sync');
var reload = browserSync.reload;

// build a unique list of active languages from sync glob
function getLanguagesfromFilesSync() {
  return glob.sync('app/modules/**/locales/*.json')
    .map(function(file) {
      return /.*?\/locales\/(\w+)\.json$/.exec(file)[1];
    })
    .filter(function(value, index, self) {
      return self.indexOf(value) === index;
    });
};

// build an object of the skeleton module.json for scaffolding
function skeletonModuleJSON(res, index) {
  var mj    = {
    key:      res.title.toLowerCase().replace(/\s/g, '-'),
    title:    res.title,
    unlocked: res.unlocked,
    description: res.description,
    index:    index,
    id:       res.title.toLowerCase().replace(/\s/g, '_'),
    activities: [{}]
  };
  return mj;
};

// build an object of the skeleton content.json for scaffolding
function skeletonCustomScript(res, page) {
  var dcj          = {},
      moduleJSON   = dcj[res.module]            = {};
      activityJSON = moduleJSON[res.activity]   = {};
      pageJSON     = activityJSON['page-'+page] = {};
      blocksJSON   = pageJSON['blocks']         = [];
  return dcj;
};

// build skeleton page-level SCSS for scaffolding
function skeletonPageLevelSCSS(res, page) {
  return "." + res.module + ".page-" + page + " {\n  //write your scss here\n}";
};


// scaffoldding module with automated module.json extensions
gulp.task('module', function() {
  gulp.src('.')
    .pipe(prompt.prompt([{
      type: 'input',
      name: 'title',
      message: 'Module name:'
    }, {
      type: 'input',
      name: 'description',
      message: 'Module description:'
    }, {
      type: 'input',
      name: 'unlocked',
      message: 'Unlocked (y/n):'      
    }], function(res) {
      var key   = res.title.toLowerCase().replace(/\s/g, '-'),
          index = glob.sync('app/modules/**/module.json').length; 
      if (!fs.existsSync('./app/modules/' + key)) {
        fs.mkdirSync('./app/modules/' + key);
      }
      res.unlocked = (res.unlocked === 'y') ? 'true' : 'false';
      fs.writeFileSync('./app/modules/' + key +'/module.json', JSON.stringify(skeletonModuleJSON(res, ++index), null, 2));
    }));
})

// scaffoldding activity with pages structure and module.json
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
      var module   =  res.module.toLowerCase().replace(/\s/g, '-');
      var activity = './app/modules/' + module + '/' + res.activity;
      if (!fs.existsSync(activity)) {
        fs.mkdirSync(activity);
      }
      var pageDir,
          moduleJSON   = JSON.parse(fs.readFileSync('./app/modules/' + module + '/module.json')),
          index        = glob.sync('app/modules/'+ module + '/*-activity*').length;
          activityJSON = moduleJSON.activities[index-1] = {};
          pagesJSON    = activityJSON.pages = [];
      activityJSON.title = res.activity.replace(/-/g, ' ');
      activityJSON.key   = res.activity;

      for(var page = 1; page <= res.pages; page++) {
        var contentJSON = skeletonCustomScript(res, page),
            pageSCSS    = skeletonPageLevelSCSS(res, page);
        pagesJSON[page-1] = {
          key: 'page-'+ page, 
          index: page-1,
          script: true
        };
        pageDir = activity + '/page-' + page;
        fs.mkdirSync(pageDir);
        fs.mkdirSync(pageDir + '/images');
        fs.mkdirSync(pageDir + '/locales');
        fs.mkdirSync(pageDir + '/templates');
        fs.writeFileSync(pageDir + '/locales/en.json', "{\n\n}");
        fs.writeFileSync(pageDir + '/_page-' + page + '.scss', pageSCSS);
        fs.writeFileSync(pageDir + '/page-' + page + '.js', '');
        fs.writeFileSync(pageDir + '/content.json', JSON.stringify(contentJSON, null, 2));
      }
      fs.writeFileSync('./app/modules/' + module +'/module.json', JSON.stringify(moduleJSON, null, 2));
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
    }], function(res) {
    var module  =  res.module.toLowerCase().replace(/\s/g, '-'),
        moduleJSON = JSON.parse(fs.readFileSync('./app/modules/' + module + '/module.json')),
        page      = glob.sync('app/modules/'+module+'/'+res.activity+ '/' + 'page-*').length + 1,
        index;
        moduleJSON.activities.forEach(function(e, i) {
          if (e.key === res.activity) {
            index = i;
          }
        });
    var pagesJSON = moduleJSON.activities[index].pages,       
        pageDir   = ['./app/modules/', 
        module, 
        '/',
        res.activity,
        '/page-' + page
      ].join('');
    var contentJSON = skeletonCustomScript(res, page),
        pageSCSS    = skeletonPageLevelSCSS(res, page);
    fs.mkdirSync(pageDir);
    fs.mkdirSync(pageDir + '/images');
    fs.mkdirSync(pageDir + '/locales');
    fs.mkdirSync(pageDir + '/templates');
    fs.writeFileSync(pageDir + '/locales/en.json', "{\n\n}");
    fs.writeFileSync(pageDir + '/_page-' + page + '.scss', pageSCSS);
    fs.writeFileSync(pageDir + '/page-' + page + '.js', '');
    fs.writeFileSync(pageDir + '/content.json', JSON.stringify(contentJSON, null, 2));
    pagesJSON[page-1] = {
      key: 'page-' + page,
      index: page - 1,
      script: true
    };
    fs.writeFileSync('./app/modules/' + module +'/module.json', JSON.stringify(moduleJSON, null, 2));
  }));
});


gulp.task('scripts', function() {
  var hbsFilter = filter('**/*.hbs'),
      jsFilter  = filter('**/*.js');
  gulp.src(['app/**/*.js', 'app/**/*.hbs'])
    .pipe(sourcemaps.init())
    .pipe(hbsFilter)
    .pipe(handlebars())
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
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('public/javascripts/'))
    .pipe(reload({stream:true}));
});

gulp.task('json', function() {
  // workaround for gulp-extend bug and an array
  var module  = gulp.src('app/modules/**/module.json')
    .pipe(concat('modules.json', {newLine: ','}))   
    .pipe(wrap('[<%= contents %>]'))
    .pipe(gulp.dest('public/content/'));
  var content = gulp.src('app/modules/**/content.json')
    .pipe(extend('module-content.json'))
    .pipe(gulp.dest('public/content'));

  merge(module, content); 
});

gulp.task('pre-styles', function() {
  return  gulp.src(['app/modules/**/*.scss'])
    .pipe(concat('_pages.scss'))
    .pipe(gulp.dest('app/styles'));  
});

gulp.task('styles', ['pre-styles'], function() {  
  var global = gulp.src(['app/styles/**/*.scss'])
    .pipe(compass({
      config_file: './config/compass.rb',
      css: 'public/stylesheets',
      sass: 'app/styles',
      images: 'app/assets/images',
      generated_images_path: 'public/images',
      logging: false,
      sourcemap: true,
      generated_images_dir: 'public/images'
    }))
    .pipe(reload({stream:true}));
  var fonts = gulp.src('app/assets/stylesheets/fonts/**', {'base': 'app/assets/stylesheets/fonts'})
    .pipe(gulp.dest('public/fonts/'));

  merge(global, fonts);
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
  var languages = getLanguagesfromFilesSync('app/modules/**/locales/*/*.json', '.*?\/locales');
  var locales   = languages.map(function(lang) {
      return gulp.src('app/modules/**/locales/'+lang+'.json')
        .pipe(extend(lang + '.json'))
        .pipe(gulp.dest('public/content/locales/'));
    });

    merge.apply(null, locales);
});

gulp.task('assets', function() {
  var assets = gulp.src('app/assets/images/**/*', {base: 'app/assets'})
    .pipe(gulp.dest('public/'));

  var moduleImages = glob.sync('app/modules/**/images/*')
    .map(function(file) {
      var location = file.split(require('path').sep).slice(2,5);
      var page     = 'app/modules/' + location.join('/');
      return gulp.src(page + '/images/*', {base: page + '/images'})
        .pipe(gulp.dest('public/images/structure/'+location[0]));
    });

    merge.apply(
      Array.prototype.concat.call(assets, moduleImages)
    );
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
   gulp.watch(["app/**/*.scss"], ['styles']);
   gulp.watch(["app/**/images/*"], ['assets']);
   gulp.watch(['bower_components/everfi-sdk/public/*'], ['everfi-sdk'])
   gulp.watch(["app/**/*.js", "app/**/*.hbs"], ['scripts']);
   gulp.watch(["app/**/content.json", "app/**/module.json"], ['json']);
   gulp.watch(["app/**/locales/*.json"], ['locales']);
});
