'use strict';

/**
 * Native modules.
 */
var fs = require('fs')
  , path = require('path');

/**
 * Third party modules.
 */
var cli = require('commander')
  , colors = require('colors')
  , _ = require('lodash');

/**
 * Square's API
 */
var Square = require('./square');

/**
 * Setup the command line interface for square.
 */
cli
  .version(require('../package.json').version)
  .usage('[options] [files]')
  .option('-e, --extensions <extensions>', 'only process files with these extensions', list, [])
  .option('-p, --plugins <plugins>', 'specify the plugins to use', list, [])
  .option('-P, --platform <platform>', 'only build files for this platform', list)
  .option('-s, --storage <storage>', 'specify the storage system', 'disk')
  .option('-w, --watch [port]', 'watch the bundled files for changes', parseInt);

cli.name = 'square';

/**
 * Commands.
 */
cli
  .command('scaffold [path]')
  .description('scaffold a square.json file')
  .action(function scaffold(destination) {
    // if we were given a path, we should create it if it doesn't exist or we
    // should just default to the users current working directory
    if (destination) require('mkdirp').sync(destination);
    else destination = process.cwd();

    // write an example square.json file
    fs.writeFileSync(path.join(destination, 'square.json'), JSON.stringify({
        configuration: {
          dist: '/path/to/storage/{type}/bundlename.{ext}'
        }

      , bundle: {
          'path/to/file.js': {
              description: '{string} -- a small description about the use of file.css'
            , weight: '{number} 100 -- used to override the default order of inclusion'
            , version: '{string} 0.0.0 -- the version of a third party script'
            , latest: '{string} -- remote url of the third party asset'
            , extract: [
                  '{array} of variable or function names to extract from the source'
                , 'if you want to exclude these functions of vars, let the first item'
                , 'be a the boolean `true`'
              ]
          },
          'example/parser.coffee': {
              description: 'config parser written in pure coffeescript'
          },
          'example/jQuery.js': {
              description: 'Cross browser DOM utility library'
            , latest: 'http://code.jquery.com/jquery.js'
            , version: '1.8.3'
          }
        }
    }, null, 2));

    process.exit(0);
  });

/**
 * Display custom help information.
 */
cli.on('--help', function help() {

});

cli.on('--watch', function watch(port) {
  // Register a signint handler so we can cleanly exit the process when
  // people press crtl+c.
  process.on('SIGINT', function sigint() {
    // Show the cursor again and add some extra spacing to the terminal
    // outpu before we cleanly exit.
    process.stdout.write('\u001b[?25h\n\n');
    process.exit(0);
  });

  /**
   * Display a spinner in the terminal the the users receive feedback
   * and know that we are watching their files for changes.
   *
   * @param {Array} frames frames that needs to be displayd
   * @param {Number} interval frame interval
   * @api private
   */
  function spinner(frames, interval) {
    interval = interval || 100;
    frames = frames || spinner.frames;

    var len = frames.length
      , i = 0;

    spinner.interval = setInterval(function tick() {
      process.stdout.write(
          '\r'
        + frames[i++ % len]
        + 'Waiting for file changes'.white
      );
    }, interval);
  }

  /**
   * Spinner frames.
   *
   * @type {Array}
   * @api private
   */
  spinner.frames = [
      '  \u001b[96m◜ \u001b[90m'
    , '  \u001b[96m◠ \u001b[90m'
    , '  \u001b[96m◝ \u001b[90m'
    , '  \u001b[96m◞ \u001b[90m'
    , '  \u001b[96m◡ \u001b[90m'
    , '  \u001b[96m◟ \u001b[90m'
  ];

  /**
   * Stop the spinner from running.
   *
   * @api private
   */
  spinner.stop = function stop() {
    process.stdout.write('\u001b[2K');
    clearInterval(spinner.interval);
  };

  // Hide the curser.
  process.stdout.write('\u001b[?25l');
  spinner();
});

/**
 * Read out a `square.opts` file where users can specify the options they want
 * to run the cli with. This allows us to bypass all the --params and just run
 * square [files] instead.
 */
try {
  var opts = fs.readFileSync('square.opts', 'utf8').trim().split(/\s+/);
  process.argv = process.argv.slice(0, 2).concat(opts.concat(process.argv.slice(2)));
} catch (err) {}

/**
 * Parse the command line arguments now that we have setup all the argument
 * event listeners.
 */
cli.parse(process.argv);

/**
 * We want to use an emit based pattern for triggering some commands, as
 * commander doesn't do this automatically.
 */
[
  'watch'
].forEach(function emit(key) {
  cli.emit('--'+ key, cli[key]);
});

// It's possible to build multiple `square.json` files at once.
cli.args.forEach(function (bundle) {
  var square = new Square({ cli: true });

  cli.plugins.forEach(function load(plugin) {
    square.plugin(plugin);
  });

  square.parse(bundle);
  square.build();
});

/**
 * Some helper function that will make it easier to process the command line
 * arguments.
 */

/**
 * Split the supplied argument to create a list (array).
 *
 * @param {String} val the command line flag value
 * @returns {Array}
 * @api private
 */
function list(val) {
  return val.split(',');
}
