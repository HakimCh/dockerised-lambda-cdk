import * as path from 'node:path';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as assets from 'aws-cdk-lib/aws-ecr-assets';
import {DockerImageFunctionProps} from "aws-cdk-lib/aws-lambda/lib/image-function";

type DockerLambdaProps = Omit<DockerImageFunctionProps, "code" | "functionName"> & {
    functionName: string[];
}

export class DockerLambdaConstruct extends Construct {
    public readonly functions: { [key: string]: lambda.DockerImageFunction } = {};
    private readonly baseImage: assets.DockerImageAsset;
    private readonly dependenciesImage: assets.DockerImageAsset;
    private readonly externalDependencies = [
        // "@prisma/client",
        "prisma",
        "sharp",
        "jsdom",
        "lodash"
    ];

    constructor(scope: Construct, id: string, props: DockerLambdaProps) {
        super(scope, id);

        const dockerLambdaProps = this.validateProps(props);

        const rootPath = path.resolve(this.node.tryGetContext('rootPath'));
        const dockerFilePath = path.join('packages', 'server', 'src', 'infrastructure', 'stacks', 'dynamic', 'docker', 'Dockerfile');

        this.baseImage = this.createBaseImage(rootPath, dockerFilePath);
        this.dependenciesImage = this.createDependenciesImage(rootPath, dockerFilePath);

        dockerLambdaProps.functionName.forEach((name) => {
            this.createFunction(name, props, rootPath, dockerFilePath);
        });
    }

    private createBaseImage(rootPath: string, dockerFilePath: string): assets.DockerImageAsset {
        return new assets.DockerImageAsset(this, 'BaseImage', {
            directory: rootPath,
            file: dockerFilePath,
            platform: assets.Platform.LINUX_AMD64,
            target: 'base'
        });
    }

    private createDependenciesImage(rootPath: string, dockerFilePath: string): assets.DockerImageAsset {
        return new assets.DockerImageAsset(this, 'DependenciesImage', {
            directory: rootPath,
            file: dockerFilePath,
            platform: assets.Platform.LINUX_AMD64,
            target: 'dependencies',
            buildArgs: {
                DEPENDENCIES_INLINE: this.externalDependencies.join(` `)
            },
            cacheFrom: [{
                type: 'registry',
                params: {
                    ref: `${this.baseImage.repository.repositoryUri}:${this.baseImage.imageTag}`,
                    mode: 'max'
                }
            }]
        });
    }

    private createFunction(name: string, props: DockerLambdaProps, rootPath: string, dockerFilePath: string): lambda.DockerImageFunction {
        const lambdaImage = new assets.DockerImageAsset(this, `${name}Image`, {
            directory: rootPath,
            file: dockerFilePath,
            platform: assets.Platform.LINUX_AMD64,
            buildArgs: {
                HANDLER_BASENAME: path.join('webhooks', name),
                DEPENDENCIES_ARGS: this.externalDependencies.map((dep) => `--external:${dep}`).join(` `)
            },
            cacheFrom: [{
                type: 'registry',
                params: {
                    ref: `${this.baseImage.repository.repositoryUri}:${this.baseImage.imageTag}`,
                    mode: 'max'
                }
            }, {
                type: 'registry',
                params: {
                    ref: `${this.dependenciesImage.repository.repositoryUri}:${this.dependenciesImage.imageTag}`,
                    mode: 'max'
                }
            }]
        });

        return new lambda.DockerImageFunction(this, `${name}Function`, {
            functionName: name,
            code: lambda.DockerImageCode.fromEcr(lambdaImage.repository, {
                tagOrDigest: lambdaImage.imageTag,
            }),
            timeout: props.timeout ?? cdk.Duration.seconds(30),
            memorySize: props.memorySize ?? 128,
            environment: props.environment ?? {},
        });
    }

    private validateProps(props: DockerLambdaProps) {
        if (!props.functionName?.length) {
            throw new Error("Missing functionName in props");
        }

        return props;
    }
}