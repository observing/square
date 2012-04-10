"use strict";

var fs = require('fs');

module.exports = function initialize (program, square) {
  console.log('  init: initialize an empty project with a new square file');
  console.log('        please select one fo the templates below');
  console.log();

  var templates = [
      'basic    - small basic square.json template'
    , 'advanced - more advanced square.json file'
    , 'complex  - leverage the full power of square'
  ];
  program.choose(templates, function pickone (selected, item) {
    process.stdin.destroy();

    console.log('Congratulations! You selected: ' + selected);
    console.log('But... this feature isnt implemented yet');
  });
};
