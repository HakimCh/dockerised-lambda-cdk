FROM public.ecr.aws/lambda/nodejs:20 AS base

ENV PRISMA_QUERY_ENGINE_BINARY="${LAMBDA_TASK_ROOT}/node_modules/.prisma/client/query-engine-rhel-openssl-1.0.x"
ENV SHARP_IGNORE_GLOBAL_LIBVIPS="1"

COPY app/package.json app/package-lock.json app/prisma app/fonts ${LAMBDA_TASK_ROOT}

RUN npm ci --unsafe-perm prisma @prisma/client sharp jsdom lodash

RUN rm -rf ${LAMBDA_TASK_ROOT}/node_modules/@prisma/engines* ${LAMBDA_TASK_ROOT}/node_modules/prisma node_modules/.bin ${LAMBDA_TASK_ROOT}/package.json ${LAMBDA_TASK_ROOT}/package-lock.json
RUN npm cache clean --force

FROM base AS lambda

ARG HANDLER_BASENAME
ARG HANDLER_FILENAME

COPY app/dist/${HANDLER_BASENAME} ${LAMBDA_TASK_ROOT}/${HANDLER_BASENAME}/

RUN echo "Content of LAMBDA_TASK_ROOT:" && \
    ls -la ${LAMBDA_TASK_ROOT}

RUN echo "#!/bin/bash" > /entry.sh && \
    echo "exec /lambda-entrypoint.sh \"${LAMBDA_TASK_ROOT}/${HANDLER_BASENAME}/${HANDLER_FILENAME}\"" >> /entry.sh && \
    chmod +x /entry.sh

ENTRYPOINT ["/entry.sh"]