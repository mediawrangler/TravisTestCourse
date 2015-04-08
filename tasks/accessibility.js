var gulp = require('gulp');
var gutil = require("gulp-util");
var through = require('through2');
var fs = require('fs');

var map = require('map-stream');
var extend = require('gulp-extend');
var glob = require('glob');

var phantom = require("gulp-phantom");
var vfsFake = require('vinyl-fs-fake');
var ngrok = require('ngrok');

var ProgressBar = require('progress');

var progressBar = {
  init: function(count){
    //can't make this a stream method because it needs the count at the beginning
    // and a stream won't tell us how many files until it finished
    this.bar = new ProgressBar(' processed :current of :total in :elapseds [:bar] :percent complete, :etas remaining', {
      total: count
    });
  },

  tick: function() {
    var self = this;
    function tick(file, enc, cb) {
      self.bar.tick();
      cb(null, file);
    }

    return through.obj(tick);
  }
};

function functionPerPage(fn) {
  var modulesFile = fs.readFileSync('public/content/modules.json');
  var modules = JSON.parse(modulesFile);
  var pages = [];
  modules.map(function (module) {
    module.activities.map(function (activity) {
      activity.pages.map(function(page){
        pages.push(fn(page, activity, module));
      });
    });
  });
  return pages;
}

function phantomScriptPerPage(scriptName) {
  var phantomScript = fs.readFileSync('tasks/phantom/' + scriptName + '.js', {encoding: 'utf-8'});

  return functionPerPage(function(page, activity, module){
    var pagePath = module.key + '/' + activity.key + '/' + page.key;
    return {
      contents: phantomScript.replace(/__url__/g, 'http://localhost:3000/#' + pagePath),
      path: pagePath + '.html'
    }
  });
}

gulp.task('generate-pages-html', ['json'], function () {
  var phantomScripts = phantomScriptPerPage('generate-html');
  progressBar.init(phantomScripts.length);

  return vfsFake.src(phantomScripts)
    .pipe(phantom({
      ext: '.html',
      debug: true
    }))
    .pipe(progressBar.tick())
    .pipe(gulp.dest('./public/raw/'));
});

gulp.task('acc-audit', function(cb) {
  var htmlFiles = glob.sync('public/raw/**/*').length;
  if (htmlFiles === 0){
    console.log("There's nothing in public/raw/, are you sure you ran `gulp generate-pages-html`?")
  } else {
    var phantomScripts = phantomScriptPerPage('axs-audit');
    progressBar.init(phantomScripts.length);

    ngrok.connect(3000, function (err, url) {
      // https://757c1652.ngrok.com -> 127.0.0.1:8080

      vfsFake.src(phantomScripts)
        .pipe(phantom({
          ext: '.html',
          debug: true
        }))
        .pipe(map(function (file, cb) {
          try {
            var axsResults = JSON.parse(file.contents.toString());
          } catch (e) {
            console.log(file.path + ' does not have JSON in it');
            console.log(file.contents.toString());
          }
          var request = new ACheckerRequest(url + '/raw/' + file.path);
          request.getResults(function (aCheckerData) {
            var results = {};
            var tempObj = results;
            var path = gutil.replaceExtension(file.path, '');
            path.split('/').forEach(function (key) {
              tempObj[key] = {};
              tempObj = tempObj[key];
            });

            tempObj.axsResults = axsResults;
            tempObj.aCheckerResults = aCheckerData;

            file.contents = new Buffer(JSON.stringify(results));
            cb(null, file);
          });
        }))
        .pipe(progressBar.tick())
        .pipe(extend('acc-output.json'))
        .pipe(gulp.dest("./public/raw/"))
        .on('end', function(){
          ngrok.disconnect();
          cb();
        });
    });
  }
});


var ACheckerRequest = (function(){
  var request = require('request');
  var xml2js = require('xml2js');
  var ACheckerRequest = function(url){
    this._url = url;
  };

  ACheckerRequest.prototype.getResults = function(callback){
    //require('request').debug = true;
    request(formattedUrl(this._url), function (err, response, body) {
      if (err)
        callback(err, formattedUrl, null);
      else {
        parseACheckerResult(body, function (err, parsedResult) {
          callback(parsedResult);
        });
      }
    });
  };

  function formattedUrl(url) {
    return {
      uri: 'http://achecker.ca/checkacc.php',
      qs: {
        uri: encodeURIComponent(url),
        id: '8729c44d535e0f92da91c43e2e614c2e47f1ac9a',
        output: 'rest',
        guide: 'WCAG2-AA'
      }
    };
  }

  function parseACheckerResult (response, callback) {
    xml2js.parseString(response, function (err, result) {
      if (err)
        callback(err, null);
      else if (result.errors) {
        //is an 'errors' document returned from the service indicating some technical problem, not a validation error
        callback(new Error(), null);
      }
      else {
        var parseResult = {};
        parseResult.status = result.resultset.summary[0].status[0];
        parseResult.numOfErrors = Number(result.resultset.summary[0].NumOfErrors[0]);
        parseResult.numOfLikelyProblems = Number(result.resultset.summary[0].NumOfLikelyProblems[0]);
        parseResult.numOfPotentialProblems = Number(result.resultset.summary[0].NumOfPotentialProblems[0]);
        callback(null, parseResult);
      }
    });
  }

  return ACheckerRequest;
})();
