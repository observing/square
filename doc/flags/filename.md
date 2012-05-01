## Filename

### Flags

- `--filename <file>` file, different file name that needs to be used for
  finding the bundle.
- `-f` short version

### Description

The file name flag allows you to override the default `square.json` and
`bundle.json` configuration file names. This can be useful if you want specify
multiple square configurations in the same directory without creating conflicts.

Please note that this flag only allows you to change the file name, not the
extension. The configuration file still needs the `.json` extension. 

If you want to specify multiple file names you can send a comma separated list
instead of one single file name.

### Usage

``` bash
square --bundle ./ --filename package
square --bundle . --filename package.json,builder.json
```
