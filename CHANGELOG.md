## v0.0.11
- [api] Introduced eval method for stylus
- [minor] Version bumps
- [fix] Correctly use ascii chars with YUI
- [api] Introduced replace method

## v0.0.10
- [Fix] Fixed compatiblity issue with the latest `fs.notify` module.

## v0.0.9
- [fix] If the wrap module is specified, also wrap the development version.
- [fix] Don't send data to the crush child processes, if the content is empty
- [fix] Fixed multiple lenght->length typo's
- [fix] Listen to the child-process `close` event instead of `exist` this causes
  bugs on Node 0.8.x 
- [minor] Bumped version numbers

## v0.0.8
- [fix] Added semicolon when concating javascript files.
- [fix] Don't queue up changes if a build fails
- [fix] Watching should watch all files again
- [fix] Bumped versions

## v0.0.7

- [new] Added outofdate functionality where syncs with the latest version in
  github to see if you are running an out of date binary
- [docs] Added more documentation for the square.json specification
- [docs] Added more documentation for the pre-processors
- [depricated] depricated the `vars` field in favor of `tags` in the
  configuration.
- [upgrade][breaking] Refactored the watcher, it's now much faster in detecting file
  changes.
- [delete] Removed pointless packages that can be lazy loaded using canihaz
- [fix] fixed the linter to lint the files with the correct based on file
  extension.
- [fix][breaking] square treats output destinations relative to the square.json
  file's location
- [upgrade] use the new closure compiler
