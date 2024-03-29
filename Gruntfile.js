'use strict';

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    api: ['./index.js', './server/**/*.js'],
    modules: ['./lib/**/*.js'],
    tests: ['./test/**/*.js'],
    specs: ['./spec/**/*.js'],
    eslint: {
      target: ['./*.js', '<%= api %>', '<%= modules %>', '<%= tests %>', '<%= specs %>']
    },
    env: {
      test: {
        src: '.env',
        RESPONSE_FAIL_ACTION: 'error',
        ORDERABLE_SEARCH_API_SVC_SERVICE_HOST: 'localhost',
        ORDERABLE_SEARCH_API_SVC_SERVICE_PORT: 9999,
        BIGWEDNESDAY_JWT: '121231231'
      }
    },
    mochaTest: {
      options: {
        reporter: 'spec',
        clearRequireCache: false,
        timeout: 4000
      },
      test: {
        src: ['<%= tests %>']
      },
      spec: {
        src: ['<%= specs %>']
      }
    },
    watch: {
      tests: {
        files: ['<%= modules %>', '<%= tests %>'],
        tasks: ['lint', 'test']
      },
      specs: {
        files: ['<%= api %>', '<%= specs %>'],
        tasks: ['lint', 'spec']
      }
    },
    retire: {
      node: ['node']
    }
  });

  grunt.registerTask('lint', 'eslint');
  grunt.registerTask('test', ['env:test', 'mochaTest:test']);
  grunt.registerTask('spec', ['env:test', 'mochaTest:spec']);
  grunt.registerTask('default', ['lint', 'test', 'spec']);
};
