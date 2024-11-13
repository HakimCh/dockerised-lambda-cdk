import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import {DockerLambdaConstruct} from "./DockerLambdaConstruct";

export class DynamicStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps) {
        super(scope, id, props);

        new DockerLambdaConstruct(this, 'DynamicLambda', {
            functionName: ["webhook-1", "webhook-2"],
            timeout: cdk.Duration.seconds(30),
            memorySize: 128,
            environment: {
                AGE_LIMIT: '16',
            },
        });
    }
}