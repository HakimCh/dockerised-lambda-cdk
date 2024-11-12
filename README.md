# Dockerized Lambda

A minimalist project demonstrating how to deploy AWS Lambda functions using Docker and CDK, optimizing shared dependencies (Prisma, Sharp, JSDOM) through multi-stage builds.

## Project Structure

```markdown
project-root/
├── app/
│   ├── package.json
│   ├── prisma/
│   ├── fonts/
│   └── src/webhooks/        # Lambda handlers
│       ├── webhook-1/
│       │   └── index.ts
│       └── webhook-2/
│           └── index.ts
├── infra/
│   └── stacks/
│       └── dynamic/
│           ├── index.ts     # CDK stack
│           └── docker/
│               └── Dockerfile
├── cdk.json
└── package.json           
```

## Key Features

- 🐳 Docker multi-stage builds for optimized images
- 🚀 Multiple Lambda functions sharing common dependencies
- 📦 Efficient layer caching strategy
- 🛠️ CDK for infrastructure as code

## Prerequisites

- Node.js >= 20
- AWS CLI configured
- Docker Desktop
- CDK CLI (`npm install -g aws-cdk`)

## Quick Start

### Build the app

```bash
cd app && npm install && npm run build
```

### Deploy lambdas

```bash
cd infra && npm install

npm run deploy
```

## Tester lambda en local

```shell
# Build local image
docker build --progress=plain --platform linux/amd64 -t lambda-test \
  --build-arg HANDLER_FILENAME=index.handler \
  --build-arg HANDLER_BASENAME=webhooks/webhook-1 \
  -f stacks/dynamic/docker/Dockerfile ../
  
# Open image shell 
docker run -it --entrypoint /bin/bash lambda-test

# Test the Lambda locally
docker run -p 9000:8080 lambda-test app/webhooks/webhook-1/index.handler

# Invoke the lambda
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'
```