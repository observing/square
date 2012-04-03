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

- Transparent support for meta languages such as coffeescript, stylus, less and
  sass. The only requirement for this is that the correct file extension is
  used so it can be matched with our compilers.
- Packages that are not commonly used by developers are lazy installed using the
  npm package. This reduces the amount of bloat that needs to be installed.
- Automatic inlining files based on special square comment statements, the only
  restriction to this is that the same filetype should be used as these files
  are not transparently processed.
- Fully customizeable by the user.
- Supports fucking awesomeness.

## Installation

Square requires you to have a minimum version of Node 0.6.10 installed on your
system. And it might require sudo privlages for installation as it needs to
install the `square` binary in the `/user/bin` directory. As square comes with a
commandline interface you should use the `-g` dash during npm installation:

```
npm install square -g
```

If the installation fails because you don't have enough privlages you should
add `sudo` in front of the npm installation command:

```
sudo npm install square -g
```

### Development

If you are interested in developing or contributing code to square you can clone
this github repository and use the `make install && sudo make install` command.
This step does require you to have both `git` and `make` installed on your
system.

```
git clone https://github.com/observing/square.git
cd square
make update
sudo make install
```

This ensures that the square binary is symlinked so every change you make to the
source code is directly reflected in the binary.

## Command line flags

### square -b, square --b

This flag indicates the location of the square.json bundle file. It does not
have to be the exact location of the file as square will search that directory
for possible bundle file matches.

It searches for either a `square.json` or a `bundle.json` in the specified
directory. If you want to change the file name of this file you can use the
`--filename` flag.

```
# search ./my/directory for a bundle file
square --bundle ./my/directory
```

### square -f, square --filename

This changes the name of the bundle file that square will be looking for, this
allows you to specifiy multiple bundle files in one single directory without
creating conflicts. This flag allows you to specify a commma sepeerated list of
files that can be used to find the bundle file.

Please note that it only allows you to specify the file name, not the extension.
The `.json` extension is still required for your file and does not need to be in
the filename that you specify using this command.

```
# search dir ./ for a package.json file
square --bundle ./ --filename package
```

### square -e, square --extension

