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
var gulpMerge    = require('merge2');
var mainBower    = require('main-bower-files');
var sass         = require('gulp-ruby-sass');
var handlebars   = require('gulp-handlebars');
var defineModule = require('gulp-define-module');
var prompt       = require('gulp-prompt');
var map          = require('map-stream');

var shell = require('gulp-shell');
var gutil = require("gulp-util");
var yaml  = require('js-yaml');

var browserSync = require('browser-sync');
var reload = browserSync.reload;

/**
 * Deploy Config
 */

var DEPLOY_CURRICULUM = require('./package').name,
    DEPLOY_VERSION    = require('./package').version
      .replace(/\./g, '_'),
    DEPLOY_BUCKET     = ['everfi-curriculums/curriculums/',
      DEPLOY_CURRICULUM,
      '/',
      DEPLOY_VERSION
    ].join('');

/**
 * Functions
*/

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
function skeletonCustomContent(res, page) {
  var dcj          = {},
      moduleJSON   = dcj[res.module]            = {};
      activityJSON = moduleJSON[res.activity]   = {};
      pageJSON     = activityJSON['page-'+page] = {};
      blocksJSON   = pageJSON['blocks']         = [];
  return dcj;
};

// build an object of the skeleton lang.json for scaffolding
function skeletonLocaleJSON(res, page) {
  var dcj          = {},
      moduleJSON   = dcj[res.module]            = {};
      activityJSON = moduleJSON[res.activity]   = {};
      pageJSON     = activityJSON['page-'+page] = {};
  return dcj;
};

// build skeleton content.yml for scaffolding
function skeletonContentYML() {
  var newline = "\n",
      tab     = '  ';
  return ['- type: text', newline,
    tab, 'items: ', newline,
    tab, tab, '- description: empty',
    newline
  ].join("");
};

// build skeleton page-level SCSS for scaffolding
function skeletonPageLevelSCSS(res, page) {
  return "." + res.module + ".page-" + page + " {\n  //write your scss here\n}";
};

// build custom load skeleton script for scaffolding
function skeletonCustomScript(page) {
  var newline = "\n",
      tab     = '  ';
  return ["var BaseExtension = require('javascripts/base-extension');", newline,
    "var animations = require('animations');", newline,
    newline,
    "var page", page, " = _.defaults({", newline,
    tab, "initialize: function(view) {", newline,
    newline,
    tab, "},", newline,
    tab, "loaded: function(view) {", newline,
    newline,
    tab, "},", newline,
    tab, "playing: function(view) {", newline,
    newline,
    tab, "},", newline,
    tab, "paused: function(view) {", newline,
    newline,
    tab, "},", newline,
    tab, "stopped: function(view) {", newline,
    newline,
    tab, "},", newline,
    tab, "completed: function(view) {", newline,
    newline,
    tab, "},", newline,
    tab, "unloading: function(view, onComplete) {", newline,
    newline,
    tab, tab, "onComplete();", newline,
    tab, "}", newline,
    "}, BaseExtension);", newline,
    newline,
    "module.exports = page", page, ";"
  ].join("");
};

/**
 * Scaffold Tasks
 */

// scaffold a module with a full activity and automated module.json
gulp.task('module', function(callback) {
  return gulp.src('.')
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
    }, {
      type: 'input',
      name: 'pages',
      message: 'Number of pages:'      
    }], function(res) {

      var key   = res.title.toLowerCase().replace(/\s/g, '-'),
          index = glob.sync('app/modules/**/module.json').length; 
      if (!fs.existsSync('./app/modules/' + key)) {
        fs.mkdirSync('./app/modules/' + key);
      }
      res.unlocked = (res.unlocked === 'y') ? 'true' : 'false';
      fs.writeFileSync('./app/modules/' + key +'/module.json', JSON.stringify(skeletonModuleJSON(res, ++index), null, 2));
      var module   = res.module = key;
      res.activity = module + '-activity';
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
        var localesJSON = skeletonLocaleJSON(res, page),
            pageSCSS    = skeletonPageLevelSCSS(res, page),
            scriptJS    = skeletonCustomScript(page),
            contentYML  = skeletonContentYML();

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
        fs.writeFileSync(pageDir + '/locales/en.json', JSON.stringify(localesJSON, null, 2));
        fs.writeFileSync(pageDir + '/_page-' + page + '.scss', pageSCSS);
        fs.writeFileSync(pageDir + '/page-' + page + '.js', scriptJS);
        fs.writeFileSync(pageDir + '/content.yml', contentYML);
      }
      fs.writeFileSync('./app/modules/' + module +'/module.json', JSON.stringify(moduleJSON, null, 2));
    }));
});

// scaffoldding empty module with automated module.json extensions
gulp.task('empty-module', function() {
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
});

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
        var localesJSON = skeletonLocaleJSON(res, page),
            pageSCSS    = skeletonPageLevelSCSS(res, page),
            scriptJS    = skeletonCustomScript(page),
            contentYML  = skeletonContentYML();

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
        fs.writeFileSync(pageDir + '/locales/en.json', JSON.stringify(localesJSON, null, 2));
        fs.writeFileSync(pageDir + '/_page-' + page + '.scss', pageSCSS);
        fs.writeFileSync(pageDir + '/page-' + page + '.js', scriptJS);
        fs.writeFileSync(pageDir + '/content.yml', contentYML);
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
    var localesJSON = skeletonLocaleJSON(res, page),
        pageSCSS    = skeletonPageLevelSCSS(res, page),
        scriptJS    = skeletonCustomScript(page),
        contentYML  = skeletonContentYML();
    fs.mkdirSync(pageDir);
    fs.mkdirSync(pageDir + '/images');
    fs.mkdirSync(pageDir + '/locales');
    fs.mkdirSync(pageDir + '/templates');
    fs.writeFileSync(pageDir + '/locales/en.json', JSON.stringify(localesJSON, null, 2));
    fs.writeFileSync(pageDir + '/_page-' + page + '.scss', pageSCSS);
    fs.writeFileSync(pageDir + '/page-' + page + '.js', scriptJS);
    fs.writeFileSync(pageDir + '/content.yml', contentYML);
    pagesJSON[page-1] = {
      key: 'page-' + page,
      index: page - 1,
      script: true
    };
    fs.writeFileSync('./app/modules/' + module +'/module.json', JSON.stringify(moduleJSON, null, 2));
  }));
});

/**
 * Build Tasks
 */

gulp.task('scripts', function() {
  var hbsFilter = filter('**/*.hbs'),
      jsFilter  = filter('**/*.js');
  gulp.src(['app/**/*.js', 'app/**/*.hbs'])
    .pipe(sourcemaps.init())
    .pipe(hbsFilter)
    .pipe(handlebars())
    .pipe(map(function(data, callback){
      data.defineModuleOptions.require = null;
      callback(null, data);
    }))
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
  var module  = gulp.src('app/modules/**/module.json')
    .pipe(concat('modules.json', {newLine: ','}))   
    .pipe(wrap('[<%= contents %>]'))
    .pipe(gulp.dest('public/content/'));

  var content = gulp.src('app/modules/**/content.*')
  .pipe(map(function(file, cb) {
    if (file.isNull()) return cb(null, file); // pass along
    if (file.isStream()) return cb(new Error("Streaming not supported"));
    if (file.path.indexOf('.yml') === -1) return cb(null, file);
    var json;
    var index    = file.path.indexOf('app/modules')
    var location = file.path.slice(index).split(require('path').sep).slice(2,5);
    var obj      = {},
        module   = obj[location[0]]      = {},
        activity = module[location[1]]   = {},
        page     = activity[location[2]] = {},
        blocks   = page['blocks']        = '<%= contents %>';
    try {
    json = yaml.load(String(file.contents.toString('utf8')));
    } catch(e) {
    console.log(e);
    console.log(json);
    }
    file.path = gutil.replaceExtension(file.path, '.json');
    file.contents = new Buffer(JSON.stringify(obj)
      .replace('"<%= contents %>"', '<%= contents %>')
      .replace('<%= contents %>', JSON.stringify(json)));
    cb(null,file);
      }))
      .pipe(extend('module-content.json'))
      .pipe(gulp.dest('public/content'))
      .pipe(reload({stream:true}));

    merge.apply(null, 
      Array.prototype.concat.call(module, content)
    );
});

gulp.task('pre-styles', function() {
  return  gulp.src(['app/modules/**/*.scss'])
    .pipe(concat('_pages.scss'))
    .pipe(gulp.dest('app/styles'));  
});

gulp.task('styles', function() {
  var compassOpts ={
    config_file: './config/compass.rb',
    css: 'public/stylesheets',
    sass: 'app/styles',
    images: 'app/assets/images',
    generated_images_path: 'public/images',
    logging: false,
    sourcemap: true,
    generated_images_dir: 'public/images'
  };
  if(process.argv[3] === '--debug'){
    compassOpts.debug = true;
    compassOpts.logging = true;
  }
  var global = gulp.src(['app/styles/**/*.scss'])
    .pipe(sourcemaps.init())
    .pipe(compass(compassOpts))
    .pipe(sourcemaps.write())
    .pipe(reload({stream:true}));
  var fonts = gulp.src('app/assets/stylesheets/fonts/**', {'base': 'app/assets/stylesheets/fonts'})
    .pipe(gulp.dest('public/fonts/'));

  merge(global, fonts);
});

gulp.task('all-styles', ['pre-styles', 'styles']);

gulp.task('everfi-sdk', function() {
  var ef_sdk_js = gulp.src(mainBower({
    filter: function (file) {
      return (file.match(/js\.map$/) || file.match(/js$/)) && file.match(/everfi-sdk/);
    }
  }))
    .pipe(gulp.dest('public/javascripts'));

  var ef_sdk_css = gulp.src(mainBower({
    filter: function (file) {
      return (file.match(/css\.map$/) || file.match(/css$/)) && file.match(/everfi-sdk/);
    }
  }))
    .pipe(gulp.dest('public/stylesheets'));

  var ef_sdk_index = gulp.src(mainBower({
    filter: function (file) {
      return file.match(/index\.html$/) && file.match(/everfi-sdk/);
    }
  }))
    .pipe(gulp.dest('public'));

  merge(ef_sdk_js, ef_sdk_css, ef_sdk_index);
});


gulp.task('vendor', function() {
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

  merge(scripts, styles, assets);
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

gulp.task('assets', function(cb) {
  return gulpMerge(gulp.src('app/assets/images/**/*', {base: 'app/assets/'})
    .pipe(gulp.dest('public/app/assets')),
    gulpMerge.apply(null, glob.sync('app/modules/**/images/*')
    .map(function(file) {
      var location = file.split(require('path').sep).slice(2,5);
      var page     = 'app/modules/' + location.join('/');
      return gulp.src(page + '/images/*', {base: page + '/images'})
        .pipe(gulp.dest('public/images/structure/'+location[0]));
  })));
});

gulp.task('deploy', ['build'], shell.task([
 'aws s3 sync public/ s3://<%= deploy_bucket %> --acl public-read --cache-control "max-age=360000" --region "us-east-1"'
], {templateData: {
    deploy_bucket: DEPLOY_BUCKET
  },
  quiet: true
  }));

// watch files for changes and reload
gulp.task('serve', function() {
  browserSync({
    server: {
      baseDir: 'public'
    },
    open: false
  });
});

// -----------------------------------------------------------

gulp.task('build', ['everfi-sdk', 'vendor', 'locales', 'json', 'assets', 'scripts', 'all-styles']);

gulp.task('default', ['everfi-sdk', 'vendor', 'locales', 'json', 'assets', 'scripts', 'all-styles', 'serve'], function(){
   gulp.watch(["app/modules/**/*.scss"], ['pre-styles']);
   gulp.watch(["app/styles/**/*.scss"], ['styles']);
   gulp.watch(["app/modules/**/images/**/*"], ['assets']);
   gulp.watch(['bower_components/everfi-sdk/public/*'], ['everfi-sdk']);
   gulp.watch(["app/**/*.js", "app/**/*.hbs"], ['scripts']);
   gulp.watch(["app/**/content.json", "app/**/content.yml", "app/**/module.json"], ['json']);
   gulp.watch(["app/**/locales/*.json"], ['locales']);
});
