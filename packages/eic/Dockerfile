FROM node:22-slim

## Install system dependencies, `gcsfuse` in particular.
RUN set -e; \
    apt-get update -y && apt-get install -y \
    curl \
    gnupg2 \
    tini \
    lsof \
    openssl \
    lsb-release; \
    gcsFuseRepo=gcsfuse-`lsb_release -c -s`; \
    echo "deb http://packages.cloud.google.com/apt $gcsFuseRepo main" | \
    tee /etc/apt/sources.list.d/gcsfuse.list; \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
    apt-key add -; \
    apt-get update; \
    apt-get install -y gcsfuse \
    && apt-get clean

ENV APP_DIR /app
ENV MNT_DIR /app/gcs
ENV HOST 0.0.0.0
ENV PORT 3000

RUN mkdir -p $APP_DIR

WORKDIR $APP_DIR

COPY . $APP_DIR

## Install application dependencies
RUN yarn install

## Apply local lilith-core modifications (for changes not yet published to npm)
RUN if [ -d "local-core-lib" ]; then \
      cp -r local-core-lib/* node_modules/@mirrormedia/lilith-core/lib/; \
    fi

RUN yarn postinstall

## Build application bundles
RUN yarn build

RUN yarn cache clean

RUN chmod +x run.sh

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD [ "/app/run.sh"]
