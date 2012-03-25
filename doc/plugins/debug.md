## debug

The debug plugin allows you to wrap debug and development statements in your
application that can be extracted during compilation. There are 2 different
statements, a debug block and an inline debug line.

Debug is configured to use double curly braces as debug block indicators as it's
valid javascript and pretty easy to type. If we where to use comments as debug
statement identifiers they would be removed during minification. These
statements can still be included you code even when it's minified.

```javascript
{{
  var debugvar = 'debug';
  console.log('debug block', debugvar);
}}

{{ console.log('inline statement'); }}
```

### options

- `start`, the regexp that finds the start of a debug block.
- `end`, the regexp that finds the ending of a debug block.
- `inline` the regexp that removes inline statement from a string.

### commandline usage

```
square --bundle dir --plugin debug
```
