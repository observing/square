```
o-o  o-o o  o o-o o-o o-o       | Square is a modulair build system for building
 \  |  | |  | |-| |   |-        | front-end code.
o-o  o-O o--o o o-o   o-o       |
       |                        | Current status: Stablizing
       o                        | Version: 0.0.8
```

# Square

The purpose of square is to provide you with building blocks to create an
advanced and maintainable build system so you can streamline your development
process and be more productive on a daily basis.

#### Features

- Transparent support for meta languages such as CoffeeScript, stylus, less and
  sass. The only requirement for this is that the correct file extension is
  used so it can be matched with our compilers.
- Packages that are not commonly used by developers are lazy installed using the
  NPM package. This reduces the amount of bloat that needs to be installed.
- Automatic inlining files based on special square comment statements, the only
  restriction to this is that the same file type should be used as these files
  are not transparently processed.
- Fully customizable by the user.
- Supports fucking awesomeness.

![Pretty hinting](http://f.cl.ly/items/0V2Q0I150j1G2j043h2q/square-hint.png)
![Watching](http://f.cl.ly/items/2z2z26213v111W2y141H/Screen%20Shot%202012-04-27%20at%209.25.55%20PM.png)

## Installation

The square build system is build upon Node.js and it requires a minimum version
of 0.8. If Node.js is not yet installed on you system you can follow the
[installation guide](https://github.com/joyent/node/wiki/Installation) or do:

```
git clone git://github.com/joyent/node.git
cd node
git checkout v0.8.0 # check nodejs.org for the latest stable version
./configure
make
make install
```

In addition to having Node 0.8 installed on your system it might also require
sudo privileges for installing the `square` binary in your `/usr/bin` directory.
I assume that you also have NPM (Node Package Manager) installed together with
your Node.js installation. If not, [install it](http://npmjs.org/) as well. It
is bundled in the recent node.js version.

Now that we have all our dependencies installed we can start installing square:

```bash
npm install square -g
```

If the installation fails because you don't have enough privileges you should
add `sudo` in front of the NPM installation command:

```bash
sudo npm install square -g
```

If you want to minify your code you should also have the
[java](http://lmgtfy.com/?q=installing+java) binary
installed on your machine as both YUI and Google Closure compiler are build
on top of it.

## Documentation
### Command line flags

1. [watch, --watch](/observing/square/blob/master/doc/flags/watch.md)
2. [filename, --filename](/observing/square/blob/master/doc/flags/filename.md)
3. [bundle, --bundle](/observing/square/blob/master/doc/flags/bundle.md)
4. [extension, --extension](/observing/square/blob/master/doc/flags/extension.md)

### Main pages

1. [The square.json build file](/observing/square/blob/master/doc/square.json.md)
2. [Transparent pre-processing](/observing/square/blob/master/doc/pre-processors.md)
2. [Comment directives](/observing/square/blob/master/doc/directive.md)

### Development

If you are interested in developing or contributing code to square you can clone
this github repository and use the `make install && sudo make install` command.
This step does require you to have both `git` and `make` installed on your
system.

```bash
git clone https://github.com/observing/square.git
cd square
make update
sudo make install
```

This ensures that the square binary is symlink so every change you make to the
source code is directly reflected in the binary.

<a name="license" />
### License (MIT)

Copyright (c) 2012 Observe.it (http://observe.it) <opensource@observe.it>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions: 

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
