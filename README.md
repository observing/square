```
o-o  o-o o  o o-o o-o o-o 
 \  |  | |  | |-| |   |-  
o-o  o-O o--o o o-o   o-o 
       |                  
       o                  
```

# Square

The whole purpose of square is to provide you with building blocks to create an
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

Square requires you to have a minimum version of Node 0.6.10 installed on your
system. And it might require sudo privileges for installation as it needs to
install the `square` binary in the `/user/bin` directory. As square comes with a
command line interface you should use the `-g` dash during NPM installation:

```bash
npm install square -g
```

If the installation fails because you don't have enough privileges you should
add `sudo` in front of the NPM installation command:

```bash
sudo npm install square -g
```

If you want to minify your code you should also have the `java` binary
installed on your machine as both YUI and Google Closure compiler are build
on top of it.

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

## Documentation
### Command line flags

1. [watch, --watch](/observing/square/blob/master/doc/flags/watch.md)
2. [filename, --filename](/observing/square/blob/master/doc/flags/filename.md)
3. [bundle, --bundle](/observing/square/blob/master/doc/flags/bundle.md)
4. [extension, --extension](/observing/square/blob/master/doc/flags/extension.md)

### Main pages

1. [The square.json build file](/observing/square/blob/master/doc/square.json.md)
2. [Transparent pre-processing](/observing/square/blob/master/doc/pre-processors.md)
2. [Comment directives](/observing/square/blob/master/doc/directives.md)
