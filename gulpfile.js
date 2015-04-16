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
var changed      = require('gulp-changed');
var watch        = require('gulp-watch');

var shell = require('gulp-shell');
var run   = require('run-sequence');
var gutil = require("gulp-util");
var yaml  = require('js-yaml');

var browserSync = require('browser-sync');
var reload = browserSync.reload;

var requireDir = require('require-dir');
var dir = requireDir('./tasks');

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
  return glob.sync('app/**/locales/*.json')
    .map(function(file) {
      return /.*?\/locales\/([a-zA-Z_-]+)\.json$/.exec(file)[1];
    })
    .filter(function(value, index, self) {
      return self.indexOf(value) === index;
    });
}

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
}

// build an object of the skeleton content.json for scaffolding
function skeletonCustomContent(res, page) {
  var dcj          = {},
    moduleJSON   = dcj[res.module]            = {},
    activityJSON = moduleJSON[res.activity]   = {},
    pageJSON     = activityJSON['page-'+page] = {},
    blocksJSON   = pageJSON['blocks']         = [];
  return dcj;
}

// build an object of the skeleton lang.json for scaffolding
function skeletonLocaleJSON(res, page) {
  var dcj          = {},
    moduleJSON   = dcj[res.module]            = {},
    activityJSON = moduleJSON[res.activity]   = {},
    pageJSON     = activityJSON['page-'+page] = {};
  return dcj;
}

// build skeleton content.yml for scaffolding
function skeletonContentYML() {
  var newline = "\n",
    tab     = '  ';
  return ['- type: text', newline,
    tab, 'items: ', newline,
    tab, tab, '- description: empty',
    newline
  ].join("");
}

// build skeleton page-level SCSS for scaffolding
function skeletonPageLevelSCSS(res, page) {
  return "." + res.module + ".page-" + page + " {\n  //write your scss here\n}";
}

// build custom load skeleton script for scaffolding
function skeletonCustomScript(page) {
  var newline = "\n",
    tab     = '  ';
  return ["var BaseExtension = require('base-extension');", newline,
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
}

/**
 * Scaffold Tasks
 */

// scaffold a module with a full activity and automated module.json
gulp.task('module', function() {
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
      index = glob.sync('app/modules/'+ module + '/*-activity*').length;
      var pageDir,
        moduleJSON   = JSON.parse(fs.readFileSync('./app/modules/' + module + '/module.json')),
        activityJSON = moduleJSON.activities[index-1] = {},
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

// scaffolding empty module with automated module.json extensions
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

// scaffolding activity with pages structure and module.json
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
        index        = glob.sync('app/modules/'+ module + '/*-activity*').length,
        activityJSON = moduleJSON.activities[index-1] = {},
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
 desired compiled structure:
 -public
 --assets
 ---javascripts
 ---images
 ---stylesheets
 ----fonts
 --content
 --index.html
 */

/**
 * libraries, scripts, json
 - everfi-sdk
 - copy js files to public/assets/javascripts/
 - copy css files to public/assets/stylesheets/
 - copy index.html to public/
 - vendor
 - compile bower js files into public/assets/javascripts/vendor.js with commonjs first
 - compile bower css files into public/assets/stylesheets/vendor.css
 - scripts
 - compile app js and hbs files into public/assets/javascripts/app.js, wrapping them as commonjs modules
 - json
 - compile all module.json files into public/content/module.json
 - compile all content.json files into public/content/module-content.json
 - copy app/course-settings.json to public/content/course-settings.json
 - locales
 - compile all locale files into a single file per language in public/content/locales
 **/
gulp.task('everfi-sdk', function() {
  var ef_sdk_js = gulp.src(mainBower({
    filter: function (file) {
      return (file.match(/js\.map$/) || file.match(/js$/)) && file.match(/everfi-sdk/);
    }
  }))
    .pipe(changed('public/javascripts'))
    .pipe(gulp.dest('public/javascripts'));

  var ef_sdk_css = gulp.src(mainBower({
    filter: function (file) {
      return (file.match(/css\.map$/) || file.match(/css$/)) && file.match(/everfi-sdk/);
    }
  }))
    .pipe(changed('public/stylesheets'))
    .pipe(gulp.dest('public/stylesheets'));

  var ef_sdk_index = gulp.src(mainBower({
    filter: function (file) {
      return file.match(/index\.html$/) && file.match(/everfi-sdk/);
    }
  }))
    .pipe(changed('public'))
    .pipe(gulp.dest('public'));

  return merge(ef_sdk_js, ef_sdk_css, ef_sdk_index);
});

gulp.task('vendor', function() {
  var scripts = gulp.src(['bower_components/**/commonjs-require.js'].concat(mainBower({
    filter: function(file){
      // Want the JS files that are everfi-sdk files
      return file.match(/.*?\.js$/) && !file.match(/everfi-sdk/) && !file.match(/.*?commonjs-require.js$/)
    }
  }), 'vendor/**/*.js'))
    .pipe(sourcemaps.init())
    .pipe(concat('vendor.js'))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('public/javascripts/'));

  var styles = gulp.src( mainBower({
    filter: function(file){
      // Want the CSS files that are everfi-sdk files
      return file.match(/css$/) && !file.match(/everfi-sdk/);
    }
  }))
    .pipe(sourcemaps.init())
    .pipe(concat('vendor.css'))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('public/stylesheets/'));

  var assets = gulp.src( mainBower({
    filter: function(file){
      return file.match(/(png|html|jpg|jpeg|woff|map)$/i) && !file.match(/everfi-sdk/);
    }
  }))
    .pipe(gulp.dest('public/'));

  var js = gulp.src('app/assets/javascripts/**/*')
    .pipe(changed('public/javascripts/'))
    .pipe(gulp.dest('public/javascripts/'));

  return merge(scripts, styles, assets, js);
});

gulp.task('scripts', function() {
  var hbsFilter = filter('**/*.hbs');
  return gulp.src(['app/**/*.js', 'app/**/*.hbs', '!app/assets/javascripts/**/*'])
    .pipe(hbsFilter)
    .pipe(handlebars())
    .pipe(map(function (data, callback) {
      data.defineModuleOptions.require = null;
      callback(null, data);
    }))
    .pipe(defineModule('commonjs'))
    .pipe(hbsFilter.restore())
    .pipe(gulpIf(/\.js$/, commonjsWrap({
      pathModifier: function (path) {
        return path
          .replace(/^.*?\/app\//, '')
          .replace(/\.js$/, '');
      }
    })))
    .pipe(sourcemaps.init())
    .pipe(concat('app.js'))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('public/javascripts/'))
    .pipe(reload({stream: true}));
});

gulp.task('json', function() {
  var group  = gulp.src('app/modules/groups.json')
    .pipe(gulp.dest('public/content'));

  var module = gulp.src('app/modules/**/module.json')
    .pipe(concat('modules.json', {newLine: ','}))
    .pipe(wrap('[<%= contents %>]'))
    .pipe(gulp.dest('public/content/'));

  var content = gulp.src('app/**/content.*')
    .pipe(map(function (file, cb) {
      if (file.isNull()) return cb(null, file); // pass along
      if (file.isStream()) return cb(new Error("Streaming not supported"));
      if (file.path.indexOf('.yml') === -1) return cb(null, file);
      var json;
      var index = file.path.indexOf('app/');
      var location = file.path.slice(index).split(require('path').sep).slice(2, 5);
      var obj = {},
        module = obj[location[0]] = {},
        activity = module[location[1]] = {},
        page = activity[location[2]] = {},
        blocks = page['blocks'] = '<%= contents %>';
      try {
        json = yaml.load(String(file.contents.toString('utf8')));
      } catch (e) {
        console.log(e);
        console.log(json);
      }
      file.path = gutil.replaceExtension(file.path, '.json');
      file.contents = new Buffer(JSON.stringify(obj)
        .replace('"<%= contents %>"', '<%= contents %>')
        .replace('<%= contents %>', JSON.stringify(json)));
      cb(null, file);
    }))
    .pipe(extend('module-content.json'))
    .pipe(gulp.dest('public/content'))
    .pipe(reload({stream: true}));

  var course = gulp.src('app/course-settings.json')
    .pipe(map(function(file, cb){
      var settings = JSON.parse(file.contents.toString('utf8'));
      settings.name = DEPLOY_CURRICULUM;
      file.contents = new Buffer(JSON.stringify(settings));
      cb(null, file);
    }))
    .pipe(gulp.dest('public/content/'));

  var localData = gulp.src('app/local-data/**/*.json')
    .pipe(wrap('module.exports = <%= contents %>;'))
    .pipe(commonjsWrap({
      pathModifier: function (path) {
        return path.replace(/^.*?\/app\//, '');
      }
    }))
    .pipe(concat('local-data.js'))
    .pipe(gulp.dest('public/javascripts/'));

  return merge.apply(null,
    Array.prototype.concat.call(group, module, content, course, localData)
  );
});

gulp.task('locales', function() {
  var languages = getLanguagesfromFilesSync('app/**/locales/*/*.json', '.*?\/locales');
  var locales   = languages.map(function(lang) {
    return gulp.src('app/**/locales/'+lang+'.json')
      .pipe(extend(lang + '.json'))
      .pipe(gulp.dest('public/content/locales/'));
  });

  return merge.apply(null, locales);
});

/**
 * assets - images, fonts, css
 - pre-images
 - copy module images to app/assets/images/structure/*module_key*
 - images (depends on pre-images)
 - copy everything from app/assets/images to public/images (need to be there for compass)
 - fonts
 - copy everything from app/assets/fonts to public/fonts
 - audio
 - copy everything from app/assets/audio to public/audio
 - pre-styles
 - compile all page styles into app/styles/_pages.scss
 - styles
 - executes compass
 - will look for images and fonts in the public directory
 - build-styles
 - ensures images (with pre-images) and fonts have been run before running styles
 **/
gulp.task('pre-images', function(){
  var pageImages = glob.sync('app/modules/**/images/*')
    .map(function (file) {
      var location = file.split(require('path').sep).slice(2, 5);
      var page = 'app/modules/' + location.join('/');
      return gulp.src(page + '/images/*')
        .pipe(changed('app/assets/images/structure/' + location[0]))
        .pipe(gulp.dest('app/assets/images/structure/' + location[0]));
    });

  return gulpMerge(pageImages);
});

gulp.task('images', ['pre-images'], function() {
  return gulp.src('app/assets/images/**/*')
    .pipe(changed('public/images/'))
    .pipe(gulp.dest('public/images/'));
});

gulp.task('fonts', function(){
  return gulp.src('app/assets/fonts/**')
    .pipe(changed('public/fonts/'))
    .pipe(gulp.dest('public/fonts/'));
});

gulp.task('audio', function(){
  return gulp.src('app/assets/audio/**')
    .pipe(changed('public/audio/'))
    .pipe(gulp.dest('public/audio/'));
});

function styles(){
  console.log('This one takes a little while....');
  var compassOpts ={
    config_file: './config/compass.rb',
    css: 'public/stylesheets',
    sass: 'app/styles',
    images: 'public/images',
    fonts: 'public/fonts',
    logging: false,
    sourcemap: true,
    generated_images_dir: 'public/images'
  };
  if(process.argv[3] === '--debug'){
    compassOpts.debug = true;
    compassOpts.logging = true;
  }
  var global = gulp.src(['app/styles/**/*.scss'])
    .pipe(compass(compassOpts))
    .pipe(gulp.dest('public/stylesheets'))
    .pipe(reload({stream:true}));

  return merge(global);
}
gulp.task('pre-styles', function() {
  var pageStyles = gulp.src(['app/modules/**/*.scss'])
    .pipe(concat('_pages.scss'))
    .pipe(gulp.dest('app/styles'));

  var courseStyles = gulp.src(['app/menu/*.scss', 'app/portfolio/*.scss'])
    .pipe(concat('_course.scss'))
    .pipe(gulp.dest('app/styles'));

  return merge(pageStyles, courseStyles);
});
gulp.task('styles', styles);
gulp.task('build-styles', ['pre-styles', 'images', 'fonts', 'audio'], styles);

/**
 * build, deploy, serve
 - build process
 - library tasks, all concurrent: everfi-sdk, vendor, scripts, json, locales
 - asset tasks:
 - pre-styles, pre-images, and fonts start concurrently
 - once pre-images is complete, images starts
 - once images, pre-styles, and fonts are complete, styles starts
 - deploy: after building, deploys to s3
 - serve: starts a browserSync server for the public folder
 - default: after building, starts serve and watches for changes
 */
gulp.task('build', ['everfi-sdk', 'vendor', 'scripts', 'json', 'locales', 'build-styles']);

gulp.task('deploy-bucket', function(){
  console.log('Deployment Bucket is: ' + DEPLOY_BUCKET);
});

gulp.task('deploy', ['build', 'deploy-bucket'],
  shell.task([
    'aws s3 sync public/ s3://<%= deploy_bucket %> --acl public-read --cache-control "max-age=360000" --region "us-east-1"'
  ], {
    templateData: {
      deploy_bucket: DEPLOY_BUCKET
    },
    quiet: true
  })
);

function serve() {
  return browserSync({
    server: {
      baseDir: 'public',
      middleware: function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        next();
      }
    },
    open: false
  });
}
gulp.task('serve', serve);

gulp.task('default', ['build'], function() {
  serve();
  watch("app/modules/**/*.scss", function() {
    run('pre-styles'); });
  watch("app/styles/**/*.scss",  function() {
    run('styles'); });
  watch("app/modules/**/images/**/*", function() {
    run('images'); });
  watch("bower_components/everfi-sdk/public/*", function() {
    run('everfi-sdk'); });
  watch(["app/**/*.js", "app/**/*.hbs"], function() {
    run('scripts'); });
  watch(["app/**/content.json", "app/**/content.yml", "app/**/module.json", "app/**/groups.json"], function() {
    run('json'); });
  watch("app/**/locales/*.json", function() {
    run('locales'); });
});