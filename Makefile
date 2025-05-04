VERSION= $(shell cat ./VERSION)
GO?= go
NPM?= npm

.PHONY: build assets deps lint prebaked-build test

all: build

deps:
	$(NPM) ci
	$(GO) mod download

assets: PATH:=$(PWD)/node_modules/.bin:$(PATH)
assets: deps
	$(GO) generate ./...
	./web/build.sh

build: assets
	$(GO) build -o ./var/sisyphus ./cmd/sisyphus
	@echo "sisyphus is now built to ./var/sisyphus"

lint: assets
	$(GO) vet ./...
	$(GO) tool staticcheck ./...

prebaked-build:
	$(GO) build -o ./var/sisyphus -ldflags "-X 'github.com/MooncellWiki/sisyphus.Version=$(VERSION)'" ./cmd/sisyphus

test: assets
	$(GO) test ./...
