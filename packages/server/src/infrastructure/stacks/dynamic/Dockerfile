FROM public.ecr.aws/lambda/nodejs:20 AS base

WORKDIR /app

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn/v6 \
    npm install --global yarn && \
    dnf install -y git  jq findutils


FROM base AS dependencies

ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

WORKDIR /app/packages/server

COPY ./packages/server/package.json ./
COPY ./packages/server/prisma ./prisma/
COPY ./packages/server/fonts ./fonts/
COPY ./packages/eslint-config ../eslint-config/

RUN sed -i.bak 's|"@clovis/eslint-config": "1.0.0"|"@clovis/eslint-config": "./eslint-config"|' package.json && \
    sed -i '/"workspaces": {/,/}/d' package.json

ARG DEPENDENCIES_INLINE
RUN yarn add --production --non-interactive --no-bin-links ${DEPENDENCIES_INLINE} @prisma/client && \
    yarn generate-lock-entry > yarn.lock && \
    cd node_modules && \
    rm -rf @prisma/engines* prisma .bin

FROM base AS build

ARG HANDLER_BASENAME
ARG HANDLER_FILENAME
ARG DEPENDENCIES_ARGS

WORKDIR ${LAMBDA_TASK_ROOT}

COPY ./packages/server/src/app/${HANDLER_BASENAME} ./src/${HANDLER_BASENAME}/

RUN --mount=type=cache,target=/root/.npm \
    npx esbuild src/${HANDLER_BASENAME}/${HANDLER_FILENAME}.ts \
    --bundle \
    --minify \
    --platform=node \
    --target=node20 \
    --outfile=index.js \
    --format=cjs \
    --loader:.node=file \
    --external:@prisma/client \
    ${DEPENDENCIES_ARGS}

FROM public.ecr.aws/lambda/nodejs:20

ARG HANDLER_NAME

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=dependencies /app/packages/server/node_modules ./node_modules/
COPY --from=dependencies /app/packages/server/fonts ./fonts/
COPY --from=build ${LAMBDA_TASK_ROOT}/index.js ./

RUN echo "#!/bin/bash" > /entry.sh && \
    echo "exec /lambda-entrypoint.sh \"${LAMBDA_TASK_ROOT}/index.${HANDLER_NAME}\"" >> /entry.sh && \
    chmod +x /entry.sh

ENTRYPOINT ["/entry.sh"]