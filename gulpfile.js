var gulp = require('gulp');
require('EverFi-SDK-Build')(gulp, {
  root: __dirname,
  DEPLOY_CURRICULUM: require('./package').name,
  DEPLOY_VERSION: require('./package').version,
  DEPLOY_BUCKET: ['everfi-curriculums/curriculums/',
    require('./package').name,
    '/',
    require('./package').version.replace(/\./g, '_')
  ].join(''),
  DEVELOP_BUCKET: ['everfi-curriculums/curriculums/',
    require('./package').name,
    '/develop'
  ].join(''),
  content: 'yaml'
});
