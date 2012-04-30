## Directive processor

Square can read `[square]` prefixed comments, called directives. The directives
processor runs on every file that you specify in your `square.json`. The
directive scan every line in your file for comments that are prefixed with
`[square]`.

The directive processor supports different types of comment blocks:

```js
// double slash comments
// [square] @require ""

/* star based comments */
/* [square] @require "" */
```

### File inclusion directives

The file inclusion directive is used to include assets or data in to your files
before they are run through any pre-processors.

```js
// we support @import, @require and @include as directive name
//
// [square] @import "./path/relative/square/json/file.random"
// [square] @require "/user/home/absolute/path.js"
// [square] @include "./path/to/another/file.js" */
```
