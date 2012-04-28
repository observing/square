## Pre-processors

Pre-processors are transparently integrated in to square, it currently supports
a range of different pre-processors that compile to either `css` or `js`. The
transparent integration of the pre-processors is made possible because we lazy
install the required modules on the fly. If you don't use CoffeeScript in your
bundles then this module will not installed on your system.

The pre-processors are not limited to "meta" langauges such as stylus and
CoffeeScript but it's also possible to pre-process template languages and store
the compiled function.

There is only one catch, in order to trigger the pre-processors you will need to
use the correct file extension for that specific pre-processor.

## Supported pre-processors

### [Stylus](http://learnboost.github.com/stylus/)

- Required file extension: `.styl`
- [NIB](http://visionmedia.github.com/nib/) is imported by default
- Compiles to `.css`

### [Less](http://lesscss.org/)

- Required file extension: `.less`
- Compiles to `.css`

### [Sass](http://sass-lang.com/)

- Required file extension: `.sass`
- There isn't a really good Node.js based parser for this, so use at your own
  risk.
- Compiles to `.css`

### [CoffeeScript](http://coffeescript.org/)

- Required file extension: `.coffee`
- Compiles to `.js`

### [Jade](http://jade-lang.com/)

- Required file extension: `.jade`
- It automatically bundles the runtime for client-side rendering
- Templates are exported under the global `jade` namespace.
- Compiles to `.js`

```js
jade.file_name_underscored = function (locals) { .. }
```
