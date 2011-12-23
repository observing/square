ALL_TESTS = $(shell find tests/ -name '*.test.js')
REPORTER = spec
UI = exports

test:
	@./node_modules/.bin/mocha \
		--require should \
		--reporter $(REPORTER) \
		--ui $(UI) \
		--growl \
		$(ALL_TESTS)

.PHONY: test
