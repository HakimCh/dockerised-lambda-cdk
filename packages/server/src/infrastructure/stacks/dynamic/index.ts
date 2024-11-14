import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { NodeModulesDockerImage} from "./DockerLambdaConstruct";

export class DynamicStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps) {
        super(scope, id, props);

        const nodeModulesDockerImage = new NodeModulesDockerImage(this, 'DynamicLambda');

        ["webhook-1", "webhook-2"].forEach((functionName) => {
            nodeModulesDockerImage.createFunction({
                functionName,
                handler: `webhooks/${functionName}/index.handler`,
                timeout: cdk.Duration.seconds(30),
                memorySize: 128,
                environment: {
                    AGE_LIMIT: '16',
                }
            })
        })

        nodeModulesDockerImage.createFunction({
            functionName: 'route_1',
            handler: `public-api/route_1/index.publicApiRoute`,
            timeout: cdk.Duration.seconds(30),
            memorySize: 128,
            environment: {
                AGE_LIMIT: '16',
            }
        })

        nodeModulesDockerImage.createFunction({
            functionName: 'worker-1',
            handler: `workers/worker-1/lambda.handler`,
            timeout: cdk.Duration.seconds(30),
            memorySize: 128,
            environment: {
                AGE_LIMIT: '16',
            }
        })
    }
}