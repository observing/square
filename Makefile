# locations of the latest compilers
YUIVERSION = yuicompressor-2.4.7
LATESTCLOSURE= http://closure-compiler.googlecode.com/files/compiler-latest.zip
LATESTYUI = http://yui.zenfs.com/releases/yuicompressor/$(YUIVERSION).zip

# configuration for the test suite
ALL_TESTS = $(shell find test/ -name '*.test.js')

# location of the vendor folder where all external tools are downloaded to
VENDOR = ./vendor
TMP = ./.build_tmp

download:
	@rm $(VENDOR)/*.jar
	@mkdir $(TMP)
	@cd $(TMP) && curl $(LATESTCLOSURE) -o closure.zip && unzip closure.zip && mv compiler.jar .$(VENDOR)/closure.jar
	@cd $(TMP) && curl $(LATESTYUI) -o yui.zip && unzip yui.zip && mv $(YUIVERSION)/build/$(YUIVERSION).jar .$(VENDOR)/yui.jar
	@rm -Rf $(TMP)

test-suite:
	@./node_modules/.bin/mocha $(ALL_TESTS)

test:
	NODE_ENV=testing $(MAKE) test-suite

test-watch:
	NODE_ENV=testing ./node_modules/.bin/mocha $(ALL_TESTS) --watch

client:
	@square --bundle ./package.json --plugin update,minify --filename package

update:
	@git submodule update --init --recursive
	@npm install .

install:
	@npm link .

todo:
	grep "@TODO" -R ./

.PHONY: test test-watch
