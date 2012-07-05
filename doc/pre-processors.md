## Pre-processors

Pre-processors are transparently integrated in to square, it currently supports
a range of different pre-processors. The transparent integration of the
pre-processors modules is made possible because we lazy install the required NPM
modules on the fly. This way we don't have to install CoffeeScript on your
system unless we actually find a file that uses CoffeeScript.

The pre-processors are not limited to "meta" languages such as Stylus and
CoffeeScript that compile in to a different language but it's also possible to
pre-process template languages and store the compiled template generation
function and re-use that in your code.

To trigger these transparent pre-processors you will need to use the correct
file extension that is tied to the pre-processor of your choice. See the list
below for the supported pre-processors and the file extensions that they
require.

## Supported pre-processors

### [Stylus](http://learnboost.github.com/stylus/)

- Stylus is an expressive CSS language for Node.js, [NIB](http://visionmedia.github.com/nib/)
  the library full of CSS3 mixins is included automatically.

- **Extension** `.styl`
- **Compiles to** `.css`

### [Less](http://lesscss.org/)

- Less, the dynamic stylesheet language.

- **Extension** `.less`
- **Compiles to** `.css`

### [Sass](http://sass-lang.com/)

- There isn't a really good Node.js based parser for this, so use at your own
  risk. There is a new node-sass compiler in the making so that might be an
  alternate option once it stablizes. (Accepting pull requests for it)

- **Extension** `.sass`
- **Compiles to** `.css`

### [CoffeeScript](http://coffeescript.org/)

- CoffeeScript is a programming language that transcompiles to JavaScript. The
  language adds syntactic sugar inspired by Ruby, Python and Haskell

- **Extension** `.coffee`
- **Compiles to** `.js`

### [Jade](http://jade-lang.com/)

- Jade is a high performance template engine heavily influenced by Haml and
  implemented with JavaScript for node. Square automatically bundles a runtime for
  client-side rendering. The templates are exported under the global `jade` name
  space.

- **Extension** `.jade`
- **Compiles to** `.js`

#### Example output:

```js
jade.file_name_underscored = function file_name_underscored(locals) { .. }
```
