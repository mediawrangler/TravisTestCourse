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

  //var hls_64k_audio_preset_id = '1351620000001-200071';
  var hls_180p_preset_id = '1426277042760-yxihot';
  var hls_0400k_preset_id = '1351620000001-200050';
  var hls_0600k_preset_id = '1351620000001-200040';
  var hls_1000k_preset_id = '1351620000001-200030';
  var hls_1500k_preset_id = '1351620000001-200020';
  var hls_2000k_preset_id = '1351620000001-200010';
  var hls_720p_preset = '1422479654864-puy87c';
  var hls_1080p_preset = '1426276620673-7a129k';
  var mp4_1080p_preset = "1351620000001-000001";
  var mp4_720p_preset = "1351620000001-000010";
  var mp4_480p_preset = "1351620000001-000020";
  var webm_180_preset_id = "1423775283372-01mxh9";
  var webm_360_preset_id = "1423775212416-rmpw8t";
  var webm_480_preset_id = "1423775184722-zfn8w7";
  var webm_720_preset_id = "1423775127554-vhnq30";
  var webm_1080_preset_id = "1426276780574-zgemta";

  var output_key = 'transcode-video';
  var output_list = [
    {
      Key: 'hls_720p/' + output_key,
      PresetId: hls_720p_preset,
      SegmentDuration: '10'
    },
    {
      Key: 'hls_180/' + output_key,
      PresetId: hls_180p_preset_id,
      SegmentDuration: '10'
    },
    {
      Key: 'hls_0400k/' + output_key,
      PresetId: hls_0400k_preset_id,
      SegmentDuration: '10'
    },
    {
      Key: 'hls_0600k/' + output_key,
      PresetId: hls_0600k_preset_id,
      SegmentDuration: '10'
    },
    {
      Key: 'hls_1000k/' + output_key,
      PresetId: hls_1000k_preset_id,
      SegmentDuration: '10'
    },
    {
      Key: 'hls_1500k/' + output_key,
      PresetId: hls_1500k_preset_id,
      SegmentDuration: '10'
    },
    {
      Key: 'hls_2000k/' + output_key,
      PresetId: hls_2000k_preset_id,
      SegmentDuration: '10'
    },
    {
      Key: 'hls_1080p/' + output_key,
      PresetId: hls_1080p_preset,
      SegmentDuration: '10'
    }
  ];

  var find_playlists = function () {
    return output_list.map(function (o) {
      return o.Key;
    });
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
    var params = {
      PipelineId: '1422479864529-p3ad8w',
      Input: {
        Key: "media/" + DEPLOY_CURRICULUM + "/" + responses.video_name + '.' + responses.video_extension,
        Resolution: 'auto',
        Container: 'mp4'
      },
      OutputKeyPrefix: "videos/" + DEPLOY_CURRICULUM + "/" + responses.language + "/" + responses.video_name + "/v" + responses.version + "/",
      Outputs: output_list,
      Playlists: [
        {
          Name: 'playlist',
          Format: 'HLSv3',
          OutputKeys: find_playlists()
        }
      ]
    };

    output_list.push(
      {
        Key: output_key + '-1080.mp4',
        PresetId: mp4_1080p_preset
      },
      {
        Key: output_key + '-720.mp4',
        PresetId: mp4_720p_preset
      },
      {
        Key: output_key + '-480.mp4',
        PresetId: mp4_480p_preset
      },
      {
        Key: output_key + '-180.webm',
        PresetId: webm_180_preset_id
      },
      {
        Key: output_key + '-360p.webm',
        PresetId: webm_360_preset_id
      },
      {
        Key: output_key + '-480p.webm',
        PresetId: webm_480_preset_id
      },
      {
        Key: output_key + '-720p.webm',
        PresetId: webm_720_preset_id
      },
      {
        Key: output_key + '-1080p.webm',
        PresetId: webm_1080_preset_id
      }
    );

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
