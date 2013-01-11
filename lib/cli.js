'use strict';

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

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
  , async = require('async')
  , _ = require('lodash');

/**
 * Square's API
 */
var Square = require('./square');

/**
 * Expose the commandline as function so custom arguments can be fed in to the
 * system.
 *
 * @param {Array} argv
 * @api public
 */
module.exports = function commandline(argv) {
  argv = argv || process.argv;

  /**
   * Setup the command line interface for square.
   */
  cli
    .version(require('../package.json').version)
    .usage('[options] [files]')
    .option('-e, --extensions <extensions>', 'only process files with these extensions', list, [])
    .option('-p, --plugins <plugins>', 'specify the plugins to use', list, [])
    .option('-P, --platform <platform>', 'only build files for this platform', list, ['web'])
    .option('-s, --storage <storage>', 'specify the storage system', list, ['disk'])
    .option('-w, --watch [port]', 'watch the bundled files for changes', parseInt);

  cli.name = 'square';

  /**
   * Scaffold command, generate an example square.json in the given directory, if
   * the given directory does not yet exist, create it for them.
   *
   * @param {String} destination
   */
  cli
    .command('scaffold [path]')
    .description('scaffold a square.json file')
    .action(function scaffold(destination) {
      // If we were given a path, we should create it if it doesn't exist or we
      // should just default to the users current working directory.
      if (destination) require('mkdirp').sync(destination);
      else destination = process.cwd();

      // Write an example square.json file.
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

      [
          ''
        , 'Created a new `square.json` file at '+ destination
        , ''
        , 'To learn more about the square.json specification take a look at our'
        , 'documentation center at github: github.com/observing/square/tree/master/doc'
        , ''
        , 'Or visit us irc: irc.freenode.net#observing'
        , ''
      ].forEach(function details(line) {
        console.log(line);
      });

      process.exit(0);
    });

  /**
   * Output the square ASCII logo.
   *
   * @param {Boolean} exit exit the node process after outputting
   */
  cli.logo = function logo(exit) {
    [
        ''
      , 'o-o  o-o o  o o-o o-o o-o '.cyan
      , ' \\  |  | |  | |-| |   |- '.cyan + ('      version: ' + cli._version).white
      , 'o-o  o-O o--o o o-o   o-o '.cyan
      , '       |                  '.cyan
      , '       o                  '.cyan
      , ''
    ].forEach(function logo(line) {
      console.log('  ' + line);
    });

    if (exit) process.exit(0);
  };

  /**
   * Output some square CLI examples.
   *
   * @param {Boolean} exit exit the node process after outputting.
   */
  cli.examples = function examples(exit) {
    [
        ''
      , 'Examples:'
      , ''
      , '# Generating a build with multiple plugins'.grey
      , 'square --plugins '.white
          + 'debug,crush '.green
          + './path/to/square.json'.white
      , ''
      , '# Automatically rebuild files on changes + live reload server'.grey
      , 'square --plugins '.white
          + 'debug,crush '.green
          + '--watch'.white + ' 8080 '.green
          + './path/to/square.json'.white
    ].forEach(function log(line) {
      console.log(line);
    });

    if (exit) process.exit(0);
  };

  /**
   * Display custom help information.
   *
   * @api public
   */
  cli.on('--help', function help() {
    cli.examples(true);
  });

  /**
   * List all the available plugins and their descriptions.
   *
   * @api private
   */
  cli.on('--list', function list() {
    var plugins = Square.plugins();
  });

  /**
   * Watching.
   *
   * @param {Number} port
   * @api public
   */
  cli.on('--watch', function watch(port) {
    // Register a signint handler so we can cleanly exit the process when
    // people press crtl+c.
    process.on('SIGINT', function sigint() {
      // Make sure we cleanly exit when we receive a SIGINT signal.
      process.exit(0);
    });

    // Show the cursor again.
    process.on('exit', function exit() {
      process.stdout.write('\u001b[?25h\n\n');
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

    // Everyting is parsed, and we can start listening for file changes.
    cli.once('parsed', function parsed(squares) {
      spinner();

      async.map(Object.keys(squares), function mapping(path, cb) {
        squares[path].files(cb);
      }, function (err, results) {
          console.log('files', err, results);
        }
      );
    });
  });

  /**
   * Read out a `square.opts` file where users can specify the options they want
   * to run the cli with. This allows us to bypass all the --params and just run
   * square [files] instead.
   */
  try {
    var opts = fs.readFileSync('square.opts', 'utf8').trim().split(/\s+/);
    argv = argv.slice(0, 2).concat(opts.concat(argv.slice(2)));
  } catch (err) {}

  /**
   * Possible errors that need be displayed when we shutdown our process.
   *
   * @type {Array}
   */
  cli.errors = [];

  /**
   * Parse the command line arguments now that we have setup all the argument
   * event listeners.
   */
  cli.logo();
  cli.parse(argv);

  // Due to some weird shit in commander.js, we have to detect flags our self
  // when calling the commandline with args.
  cli.unknown = cli.parseOptions(cli.normalize(argv.slice(2))).unknown;
  if (cli.unknown.length) {
    return cli.unknownOption(cli.unknown[0]);
  }

  /**
   * We want to use an emit based pattern for triggering some commands, as
   * commander doesn't do this automatically.
   */
  [
    'watch'
  ].forEach(function emit(key) {
    if (cli[key]) cli.emit('--'+ key, cli[key]);
  });

  /**
   * Check if the dependencies exist. If we don't have any agruments we should
   * check if the current working directory has a `square.json` use that instead.
   *
   * @param {String} bundle
   */
  if (!cli.args.length && fs.existsSync('square.json')) {
    cli.args.push('square.json');
  } else {
    cli.args = cli.args.filter(function filer(bundle) {
      var valid = fs.existsSync(bundle);

      if (!valid) {
        cli.errors.push(
            'Unable to locate ' + bundle.red
          + '. Make sure file exists and that the path is specified correctly.'
        );
      }

      return valid;
    });
  }

  /**
   * It's possible to supply multipe square.json files in to the binary, we need
   * to process each one of them and apply the same plugins and storage
   * containers.
   *
   * @param {Object} memo
   * @param {String} bundle
   * @param {Function} callback
   */
  async.reduce(cli.args, {}, function (memo, bundle, callback) {
    var square = new Square({
        'cli': true
      , 'log level': 8
    });

    // Initialize the plugins.
    cli.plugins.forEach(function load(plugin) {
      if (square.plugin(plugin)) {
        square.logger.debug('adding plugin %s', plugin);
      }
    });

    // Initialize the storage containers.
    cli.storage.forEach(function load(storage) {
      if (square.storage(storage)) {
        square.logger.debug('attaching the %s storage engine', storage);
      }
    });

    // See if we could parse the given square file.
    if (!square.parse(bundle)) {
      square.logger.debug('failed to parse %s', bundle);
    }

    // Generage the builds, do this in an async loop so we can emit an callback
    // once everything has been build according to the specifications
    async.forEach(
        cli.platform
      , function build(platform, done) {
          square.build(platform, cli.extensions, done);
        }
      , function finished(err, builds) {
          callback(err, memo);
        }
    );

    memo[bundle] = square;
  }, function done(err, reduced) {
    cli.squares = reduced;
    cli.emit('parsed', reduced);

    // If we are not watching the files for changes we should destroy all the
    // square instances so our processes exits.
    if (cli.watch) return;

    _.each(reduced, function killswitch(square, bundle) {
      square.logger.debug('destroying instance that processed %s', bundle);
      square.destroy();
    });
  });

  if (!cli.args.length) {
    [
        'Missing files argument, make sure you call square with the correct arguments'
      , ''
      , '  square [options] ' + '[files]'.green
      , ''
      , 'Thanks for flying Square ■'
    ].forEach(function errors(line) {
      cli.errors.push(line);
    });
  }

  /**
   * Output all the found errors to STDERR.
   */
  if (cli.errors) cli.errors.forEach(function error(line) {
    console.error(line);
  });

  return cli;
};

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
