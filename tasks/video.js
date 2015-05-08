var gulp = require('gulp');
var shell = require('gulp-shell');
var prompt = require('prompt');

var DEPLOY_CURRICULUM = require('../package').name;

//gulp.task('upload_videos', function(){
//  var aws_creds = require('./aws_creds');
//
//  var s3 = require('gulp-s3-upload')({
//    accessKeyId: aws_creds.accessKeyId,
//    secretAccessKey: aws_creds.secretAccessKey
//  });
//
//  gulp.src('./public/assets/videos/Ambitious_Andy.mp4')
//    .pipe(s3({
//      Bucket: 'everfi-content/media/transit',
//      ACL: 'public-read'
//    }));
//});

gulp.task('sync-videos',
  shell.task([
    'aws s3 sync app/assets/videos/ s3://everfi-content/media/<%= curriculum %> --acl public-read --cache-control "max-age=360000" --region "us-east-1"'
  ], {
    templateData: {
      curriculum: DEPLOY_CURRICULUM
    }
  })
);

gulp.task('transcode-videos', function(cb) {
  var AWS = require('aws-sdk');

  var presets = {
    hls: {
      '0400k': '1351620000001-200050',
      '0600k': '1351620000001-200040',
      '1000k': '1351620000001-200030',
      '1500k': '1351620000001-200020',
      '2000k': '1351620000001-200010',
      '180p': '1426277042760-yxihot',
      '720p': '1422479654864-puy87c',
      '1080p': '1426276620673-7a129k'
    },
    mp4: {
      '180p': '1351620000001-000061',
      '360p': '1351620000001-000040',
      '480p': "1351620000001-000020",
      '720p': "1351620000001-000010",
      '1080p': "1351620000001-000001"
    },
    webm: {
      '180p': "1423775283372-01mxh9",
      '360p': "1423775212416-rmpw8t",
      '480p': "1423775184722-zfn8w7",
      '720p': "1423775127554-vhnq30",
      '1080p': "1426276780574-zgemta"
    }
  };

  prompt.start();
  var schema = {
    properties: {
      video_name: {
        description: "Video Name (w/out extension):"
      },
      video_extension: {
        description: "Extension (no dot):"
      },
      version: {
        description: "Version (just the number):"
      },
      language: {
        description: "Language:"
      }
    }
  };
  prompt.get(schema, function (err, responses) {
    var videoKey = responses.video_name.toLowerCase().replace(/ |_/g, '-');

    var output_list = [];
    var playlist = [];
    Object.keys(presets.hls).forEach(function(key){
      var hlsId = 'hls_' + key + '/' + videoKey;
      output_list.push({
        Key: hlsId,
        PresetId: presets.hls[key],
        SegmentDuration: '10'
      });
      playlist.push(hlsId);
    });
    Object.keys(presets.mp4).forEach(function(key){
      output_list.push({
        Key: videoKey + '-' + key + '.mp4',
        PresetId: presets.mp4[key]
      });
    });
    Object.keys(presets.webm).forEach(function(key){
      output_list.push({
        Key: videoKey + '-' + key + '.webm',
        PresetId: presets.webm[key]
      });
    });

    output_list[0].ThumbnailPattern = videoKey + '-{count}';

    var params = {
      PipelineId: '1422479864529-p3ad8w',
      Input: {
        Key: "media/" + DEPLOY_CURRICULUM + "/" + responses.video_name + '.' + responses.video_extension,
        Resolution: 'auto',
        Container: 'mp4'
      },
      OutputKeyPrefix: "curriculums/" + DEPLOY_CURRICULUM + "/media/videos/" + responses.language + "/" + videoKey + "/v" + responses.version + "/",
      Outputs: output_list,
      Playlists: [
        {
          Name: 'playlist',
          Format: 'HLSv3',
          OutputKeys: playlist
        }
      ]
    };
    console.log(output_list);

    var options = {
      region: 'us-east-1'
    };

    var elastic_transcoder = new AWS.ElasticTranscoder(options);
    elastic_transcoder.createJob(params, function(err, data){
      if(err){
        console.log('err', err.stack);
      } else{
        console.log(data);
        cb();
      }
    });
  });
});

