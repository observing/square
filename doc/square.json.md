# Square.json specification / configuration file

The square.json specification is inspired by the common.js package specification
that is used in Node.js. Instead of following the same specification it tries to
be an addition to it so you can actually use the square.json keys directly in to
your package.json.

## Naming convention

`square.json` in the preferred name for the configuration file. But if you
already have an `package.json` file in the directory you can use that instead.

If your file is using `.json` extension it should be valid JSON, not just an
object literal. However we do pre-process the `.json` files and remove single
line and multi line JavaScript comments from the file. Which makes using `.json`
files for configurations a bit easier to work with.

_With the release of Square 1.0 we will support the usage of object literals if
you use `.js` files for your configuration. These files do need to follow the
Node.js module specification and export it self as an object using
`module.exports = { .. your configuration }`._

## Required fields

Each file must provide the following fields in it's configuration descriptor,
square.json:

- **bundle**
  - Object of files which should be build with square.

- **configuration**
  - Object of options that is used to configure square and it's output locations.
    See the configuration section of this file for more details.

## The bundle fields

## The configuration fields

The configuration field allows you to globally configure square and it's output.
The most important property in the configuration is the `dist` field.

- [The configuration defaults](/observing/square/blob/master/static/index.js)

### The dist field

The dist field tells square where it should output the final builds
(distributions). There are current 2 different type's of distributions supported,
`min` (minified) and `dev` (development)

The path and file names can be changed by using tags, see the dedicated
[tagging](#tagging) section about more information about this concept.

#### Example Object notation

```js
{
  "configuration": {
    "dist": {
        "min": "~/square.{type}.{ext}" // -> ~/square.min.css
      , "dev": "/path/{ext}/{type}/core.{ext}" // -> /path/dev/css/core.css
    }
  }
}
```

#### Example String notation

```js
{
  "configuration": {
    "dist": "~/square.{type}.{ext}" // -> ~/square.min.css
  }
}
```

### The watch field

The watch field allows you to watch different extensions for updates than those
in that are defined in your square.json bundles. For example might have a `.js`
file that  uses [square directive comments]() to inline `.json` files for you.
And you want to have a re-build triggered when one of those `.json` files
changes so if you put `.json` in the watch field square will also re-build your
bundle when a `.json` file is changed.

The extensions that you put in the watch field do not need to be prefixed with a
`.` this is automatically done by square.

#### Example

```js
{
  "configuration": {
    "watch": ["json"]
  }
}
```

**(note)** This field only works if you are using the
[--watch](observing/square/blob/master/doc/flags/watch.md) command line flag.

### The plugins field

Most of the time when you are using square's [plugins]() you don't need to
configure anything as they are configured to serve the most common use case. How
ever it could be possible that you want to configure the plugins.

The key of this Object should be the name of the plugin (in lowercase) and the
value would be an Object with options that you want to configure.

To see find out which options each plugin supports, you would have to checkout
the [relevant documentation for each plugin](/observing/square/tree/master/doc/plugins).

#### Example configuration for the crush plugin

```js
{
  "configuration": {
    "plugins": {
        "crush": {
            "level": 5 // use crush level 5, yui + closure + uglify
        }
    }
  }
}
```

**(note)** This field only works if you are using the
[--plugin](/observing/square/tree/master/doc/flags/plugin.md) command line flag.

### The (jshint|csslint) fields

Code quality is something that most front-end developers hold close to their
hearts, these fields allow you to specify your rules.

In addition to the jshint field, we also check for a `.jshintrc` file in your
home directory and have that override the configuration supplied in the
square.json file.

#### Example JSHint configuration

```js
{
  "configuration": {
    "jshin": {
        "laxcomma": true
      , "strict": true
    }
  }
}
```

**(note)** This field only works if you are using the
[--plugin](/observing/square/tree/master/doc/flags/plugin.md) command line flag
combined with the actual `lint` plugin.

### The license field

The license field allows you to add an optional license header at the top of
each distribution. The license field's value should be a path to a license file.

At the this time of writing you need to make sure that your license file is
commented correctly for the file that needs to be included as square just puts
the complete file's content above your distribution.

The contents of the license header can be changed by using tags, see the
dedicated [tagging](#tagging) for more information about this concept.

#### Example license file

```plain
/*! 
 * Copyright {year}, Observe.it
 * Licensed under MIT
 * Build generated by {user} on {host}
 * Rollback: {sha} / {branch}
 */
```

#### Example license configuration

```js
{
  "configuration": {
    "license": "./LICENSE"
  }
}
```

## Tagging

Square has a concept of tagging, which allows you to construct file contents or
pathnames based on tags. The are couple places where you can use these tags:

- License file that you specified in the configuration field.
- File names & paths of you specified in the configuration field.

The following tags are available for usage:

<table>
<tr>
<td>type</td>
<td>The distribution type, either <strong>min</strong> or <strong>dev</strong>.</td>
</tr>
<tr>
<td>md5</td>
<td>MD5 hash of the file contents without any optional license headers.</td>
</tr>
<tr>
<td>ext</td>
<td>The expected output extension.</td>
</tr>
<tr>
<td>date</td>
<td>The current date, formatted as: <em>Sunday, April 29, 2012.</em></td>
</tr>
<tr>
<td>year</td>
<td>The current year.</td>
</tr>
<tr>
<td>user</td>
<td>The USER environment flag.</td>
</tr>
<tr>
<td>host</td>
<td>The host name of the machine that generated the output.</td>
</tr>
<tr>
<td>branch <strong>(git)</strong></td>
<td>The current branch that is checked out in your git repository.</td>
</tr>
<tr>
<td>sha <strong>(git)</strong></td>
<td>The SHA1 of your current checkout.</td>
</tr>
</table>

**(git)** The requirement for these tags is that the square.json file is in a
git repository.

In addition the tags fields specified above, it's also possible to add tags your
self by adding an **tags** `object` to the configuration section. Where the key
of the object is name of the tag. If you have a `package.json` specified in
working directory we will automatically pre-fill the `tags` field with key =>
values of it.

## Full configuration example:

```js
{
    "configuration": {
        // [required] the "dist" object tells square where it should output the
        // final builds. It can either be a relative or absolute path including the
        // file name
        "dist": {
            "min": "/random/path/filename"  // defaults to: ~/square.{type}.{ext}
          , "dev": "./path/file.name"       // defaults to: ~/square.{type}.{ext}
        }

        // [optional] override the extensions that the watch flag should filter
        // away. If you supply an array it will trigger a rebuild on every file
        // change in the directory
      , "watch": []

        // [optional] configuration options for the plugins, the key inside this
        // object directly maps to the name of the plugin, and value is the config
        // object that will be used to extend the default config
      , "plugins": {
            "crush": { .. options .. }
        }

        // [optional] jshint configuration, or it will try to use your .jshintrc
        // from your home directory
      , jshint: {}

        // [optional] csslint configuration, use boolean values to enable or
        // disable rules
      , csslint: {}

        // [optional] license header that needs to be added on top of every
        // output file
      , license: 'path to license file for each bundled file'

        // [optional] extra variables that you want to have available for every
        // function that makes use of the template tag helper function
      , tags: {}
    }

    ..
}
```
