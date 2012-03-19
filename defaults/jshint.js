/**
 * Default JShint configuration
 *
 * @type {Object}
 */

module.exports = {
    "asi": true           // Tolerate Automatic Semicolon Insertion (no semicolons).
  , "bitwise": true       // Prohibit bitwise operators (&, |, ^, etc.).
  , "boss": true          // Tolerate assignments inside if, for & while.
  , "browser": true       // Standard browser globals e.g. `window`, `document`.
  , "couch": false        // CouchDB JavaScript env
  , "curly": false        // Require {} for every new block or scope.
  , "debug": false        // Allow debugger statements e.g. browser breakpoints.
  , "devel": false        // Allow developments statements e.g. `console.log();`.
  , "dojo": false         // Assume that Dojo is loaded
  , "eqeqeq": true        // Require triple equals i.e. `===`.
  , "eqnull": false       // Tolerate use of `== null`.
  , "es5": true           // Allow EcmaScript 5 syntax.
  , "evil": true          // Tolerate use of `eval`.
  , "expr": false         // Tolerate `ExpressionStatement` as Programs.
  , "forin": true         // Tolerate `for in` loops without `hasOwnPrototype`.
  , "globalstrict": false // Allow global "use strict" (also enables 'strict').
  , "immed": true         // Require immediate invocations to be wrapped in parens
  , "jquery": true        // Assume that jQuery is loaded
  , "latedef": true       // Prohipit variable use before definition.
  , "laxbreak": true      // Tolerate unsafe line breaks e.g. `return [\n] x`.
  , "loopfunc": false     // Allow functions to be defined within loops.
  , "maxerr": 100         // Maximum error before stopping.
  , "mootools": false     // Assume that MooTools is loaded
  , "newcap": false       // Require capitalization of all constructor `new F()`.
  , "noarg": true         // Prohibit use of `arguments.caller/callee`.
  , "node": false         // Node.js env
  , "noempty": true       // Prohipit use of empty blocks.
  , "nomen": false        // Prohibit use of initial or trailing underbars in names.
  , "nonew": true         // Prohibit use of constructors for side-effects.
  , "onevar": false       // Allow only one `var` statement per function.
  , "passfail": false     // Stop on first error.
  , "plusplus": false     // Prohibit use of `++` & `--`.
  , "predef": []          // Pre-defined variables
  , "prototypejs": false  // Assume that Prototype is loaded
  , "regexdash": false    // Tolerate unescaped last dash i.e. `[-...]`.
  , "regexp": false       // Prohibit `.` and `[^...]` in regular expressions.
  , "rhino": false        // Mozilla Rhino env
  , "scripturl": true     // Tolerate script-targeted URLs.
  , "shadow": true        // Allows re-define variables later in code.
  , "strict": false       // Require `use strict` pragma  in every file.
  , "sub": false          // Tolerate all forms of subscript notation.
  , "supernew": false     // Tolerate `new function () { ... };` and `new Object;`.
  , "trailing": true      // Prohibit trailing whitespaces.
  , "undef": false        // Require all non-global vars be declared before used.
  , "white": false        // Check against strict whitespace and indentation rules.
  , "wsh": false          // Windows Scripting Host.
};
