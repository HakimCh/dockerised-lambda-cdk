import * as assets from "aws-cdk-lib/aws-ecr-assets";
import type { DockerImageFunctionProps } from "aws-cdk-lib/aws-lambda";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from "node:path";
import { toPascalCase } from "../../utils";

type DockerLambdaProps = Omit<
    DockerImageFunctionProps,
    "code" | "functionName"
> & {
    handler: string;
    functionName: string;
};

export class NodeModulesDockerImage extends Construct {
    private readonly baseImage: assets.DockerImageAsset;
    private readonly dependenciesImage: assets.DockerImageAsset;
    private readonly rootPath: string;
    private readonly dockerFilePath: string;
    private readonly externalDependencies = [
        // "@prisma/client",
        "prisma",
        "sharp",
        "jsdom",
        "lodash",
    ];

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.rootPath = path.resolve(this.node.tryGetContext("rootPath"));
        this.dockerFilePath = path.join(
            "packages",
            "server",
            "src",
            "infrastructure",
            "stacks",
            "dynamic",
            "Dockerfile"
        );

        this.baseImage = this.createBaseImage();
        this.dependenciesImage = this.createDependenciesImage();
    }

    public createFunction({
                              handler,
                              ...props
                          }: DockerLambdaProps): lambda.DockerImageFunction {
        const [HANDLER_BASENAME, HANDLER_FILENAME, HANDLER_NAME] = handler.split(
            /([a-zA-Z]+)\.(?=[^.]+$)/
        );

        const lambdaImage = new assets.DockerImageAsset(
            this,
            `${toPascalCase(props.functionName)}LambdaDockerImage`,
            {
                buildArgs: {
                    DEPENDENCIES_ARGS: this.externalDependencies
                        .map((dep) => `--external:${dep}`)
                        .join(` `),
                    HANDLER_BASENAME,
                    HANDLER_FILENAME,
                    HANDLER_NAME,
                },
                cacheFrom: [
                    {
                        params: {
                            mode: "max",
                            ref: `${this.baseImage.repository.repositoryUri}:${this.baseImage.imageTag}`,
                        },
                        type: "registry",
                    },
                    {
                        params: {
                            mode: "max",
                            ref: `${this.dependenciesImage.repository.repositoryUri}:${this.dependenciesImage.imageTag}`,
                        },
                        type: "registry",
                    },
                ],
                directory: this.rootPath,
                file: this.dockerFilePath,
                platform: assets.Platform.LINUX_AMD64,
            }
        );

        return new lambda.DockerImageFunction(
            this,
            `${toPascalCase(props.functionName)}LambdaDockerFunction`,
            {
                ...props,
                code: lambda.DockerImageCode.fromEcr(lambdaImage.repository, {
                    tagOrDigest: lambdaImage.imageTag,
                }),
            }
        );
    }

    private createBaseImage(): assets.DockerImageAsset {
        return new assets.DockerImageAsset(this, "BaseLambdaDockerImage", {
            directory: this.rootPath,
            file: this.dockerFilePath,
            platform: assets.Platform.LINUX_AMD64,
            target: "base",
        });
    }

    private createDependenciesImage(): assets.DockerImageAsset {
        return new assets.DockerImageAsset(this, "DependenciesLambdaDockerImage", {
            buildArgs: {
                DEPENDENCIES_INLINE: this.externalDependencies.join(` `),
            },
            cacheFrom: [
                {
                    params: {
                        mode: "max",
                        ref: `${this.baseImage.repository.repositoryUri}:${this.baseImage.imageTag}`,
                    },
                    type: "registry",
                },
            ],
            directory: this.rootPath,
            file: this.dockerFilePath,
            platform: assets.Platform.LINUX_AMD64,
            target: "dependencies",
        });
    }
}
