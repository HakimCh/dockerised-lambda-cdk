import * as fs from 'fs-extra';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as assets from 'aws-cdk-lib/aws-ecr-assets';

export class DynamicStack extends cdk.Stack {
    private baseImage: assets.DockerImageAsset;

    constructor(scope: Construct, id: string, props: cdk.StackProps) {
        super(scope, id, props);

        const rootPath = this.node.tryGetContext('rootPath');
        const lambdas = ["webhook-1", "webhook-2"];

        this.baseImage = this.createBaseImage(rootPath);

        lambdas.forEach(lambdaName => {
            this.createFunction(lambdaName, rootPath);
        });
    }

    private createBaseImage(rootPath: string): assets.DockerImageAsset {
        return new assets.DockerImageAsset(this, 'BaseImage', {
            directory: rootPath,
            file: path.join('infra', 'stacks', 'dynamic', 'docker', 'Dockerfile'),
            platform: assets.Platform.LINUX_AMD64,
            target: 'base',
            buildArgs: {
                DEPENDENCIES_HASH: this.calculateDependenciesHash(rootPath),
            }
        });
    }

    private createFunction(name: string, rootPath: string) {
        const lambdaImage = new assets.DockerImageAsset(this, `${name}Image`, {
            directory: rootPath,
            file: path.join('infra', 'stacks', 'dynamic', 'docker', 'Dockerfile'),
            platform: assets.Platform.LINUX_AMD64,
            target: 'lambda',
            buildArgs: {
                HANDLER_BASENAME: path.join('webhooks', name),
                HANDLER_FILENAME: 'index.handler',
            },
            cacheFrom: [{
                type: 'registry',
                params: {
                    ref: `${this.baseImage.repository.repositoryUri}:${this.baseImage.imageTag}`,
                    mode: 'max'
                }
            }]
        });

        new lambda.DockerImageFunction(this, `${name}Function`, {
            functionName: name,
            code: lambda.DockerImageCode.fromEcr(lambdaImage.repository, {
                tagOrDigest: lambdaImage.imageTag,
            }),
            timeout: cdk.Duration.seconds(30),
            memorySize: 128,
            environment: {
                AGE_LIMIT: '16',
            },
        });
    }

    private calculateDependenciesHash(workDirectory: string): string {
        const packageLockPath = path.resolve(workDirectory, 'app', 'package-lock.json');

        if (!fs.existsSync(packageLockPath)) {
            console.warn(`package-lock.json non trouvé à : ${packageLockPath}`);
            return crypto.randomBytes(32).toString('hex');
        }

        try {
            const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf-8'));
            const dependencies = ['prisma', '@prisma/client', 'sharp', 'jsdom'];

            const depsHash = dependencies.map(dep => {
                const pkg = packageLock.packages[`node_modules/${dep}`];
                return `${dep}@${pkg?.version}:${pkg?.integrity || ''}`;
            }).join('|');

            return crypto.createHash('sha256').update(depsHash).digest('hex');
        } catch (err) {
            console.error('Erreur lors du calcul du hash des dépendances:', err);
            return crypto.randomBytes(32).toString('hex');
        }
    }
}