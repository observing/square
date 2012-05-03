## square.json

The `square.json` files are the build files for the square build system. It
allows you to configure you own build process and tell the builder which files
needs to be processed to create your desired end result.

### Configuring

There are couple settings that can be configured in the `square.json` file. The
most important property in the configuration is the `dist` object. This is
allows you to configure where square should write the final build files and what
file name they should have. It writes the dev (development) and min (minified)
files in your home directory.

The `min` and `dev` value are processed by a special template tag helper so you
can easily generate powerfull builds based on some tags:

```js
"dist" : {
    "min": "~/square.{type}.{ext}" // -> ~/square.min.css
  , "dev": "/path/{ext}/{type}/core.{ext}" // -> /path/dev/css/core.css
}
```

To see a full list of available tags, take a look at the tags section below.

#### Tags

- `{type}` output type, either `min` or `dev`
- `{md5}` a MD5 hash of the file's content
- `{branch}` if the square command is executed in a git repository, this will
  hold the branch name
- `{sha}` if the square command is executed in a git repository, this will hold
  last SHA value.
- `{ext}` output extension, either `css` or `js`
- `{date}` current in the following format: `Sunday, April 29, 2012`
- `{year}` current year
- `{user}` value of the environment USER
- `{host}` hostname of the machine

In additon to the list above, every key => value pair that you specify in the
`configuration.vars` will also be made available as tag.

#### Full configuration example:

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
      , vars: {}
    }

    ..
}
```

### Specifying your bundles

Specifying the files in the bundle.

```js
{
    "configuration" { .. see above .. }
  , "bundle": {
  
    }
}
```

