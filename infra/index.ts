#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib/core";
import { DynamicStack } from "./stacks/dynamic";

const app = new cdk.App();

new DynamicStack(app, `DynamicStack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
