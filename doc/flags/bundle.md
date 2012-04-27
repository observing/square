## Bundle

### Flags

- `--bundle <directory>` directory is the location where we search for bundle
  files. It's a required argument.
- `-b` short version

### Description

The bundle flag is the most important flag in square, it allows you to tell
square in what directory it should start searching for the bundle
specification. In this directory square will search for either a `square.json`
or a `bundle.json` file.

### Usage

```bash
square --bundle ./my/directory
square --bundle .
```
