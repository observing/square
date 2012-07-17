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

test:
	@./node_modules/.bin/mocha $(ALL_TESTS)

client:
	@square --bundle ./package.json --plugin update,crush --filename package

update:
	@git submodule update --init --recursive
	@npm install .

install:
	@npm link .

.PHONY: test
