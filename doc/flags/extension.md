## Extension

### Flags

- `--extension <extension>` extension, the file extension that we should build
- `-e` short version

### Description

The extension flag is used to tell square which type of build you want to
output. As square is primarily build for front-end development it currently
supports the following output extensions:

- `js` JavaScript files, this is also the default value.
- `css` Cascading Style Sheets.

The extension flag is only used for finding files that either have that
extension or compile code to that extension. For example if you use `--extension
css` it will compile a build with all the `.css`, `.styl`, `.less` and `.sass`
files that you specified in your bundle.

### Usage

```bash
square ---bundle . --extension css
```
