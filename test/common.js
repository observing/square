"use strict";

/**
 * Expose some globals which will be used during the test suite.
 */

// set up chai, our assertation library
global.chai = require('chai');
global.sinon = require('sinon');
global.sinonChai = require('sinon-chai');

global.chai.use(global.sinonChai);
global.chai.Assertion.includeStack = true;
global.expect = global.chai.expect;

// setup Square
global.Square = require('../lib/square');

// setup some handy util methods
global.execSync = require('shelljs').exec;
