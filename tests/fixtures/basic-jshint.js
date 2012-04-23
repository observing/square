"use strict";

function foo () { return 'pew'; }
function bar () { return 'wep'; }

var varbar = 'bar'
varfoo = 'foo';

var anothermissing = 'semicolon' var anderrors = '';

// this should fail at jshint as arguments.callee is forbidden in strict mode
setTimeout(function () {
  setTimeout(arguments.callee, 100);
}, 100);
