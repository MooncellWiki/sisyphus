FROM node:22-alpine AS frontend-build-stage

ENV PNPM_HOME="/pnpm"

ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY . /tmp

WORKDIR /tmp

RUN pnpm install && pnpm --filter=frontend run build

FROM golang:1.24-alpine AS backend-build-stage

COPY . /app/

WORKDIR /app

RUN go mod download

COPY --from=frontend-build-stage /tmp/web/static /app/web/static

ENV GOOS=linux

ENV GOARCH=amd64

RUN go generate ./... && go build -o ./var/sisyphus ./cmd/sisyphus

FROM golang:1.24-alpine

WORKDIR /app

ENV TZ=Asia/Shanghai

COPY --from=backend-build-stage /app/var/sisyphus /app/var/sisyphus

RUN chmod -R +x ./var/sisyphus

CMD ["./var/sisyphus"]
