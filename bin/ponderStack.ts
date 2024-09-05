#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import InfraStack from "../lib/ponderStack";
import MaintainServiceStack from "../lib/maintainServiceStack";
import { execSync } from "child_process";
import { getConfig } from "../lib/config";

const config = getConfig();

const app = new cdk.App();

const maintainStack = new MaintainServiceStack(app, "MaintainServiceStack", {
  env: { region: process.env.REGION!, account: process.env.ACCOUNT! },
});

const stack = new InfraStack(app, "PonderStack", {
  env: { region: process.env.REGION!, account: process.env.ACCOUNT! },
  config: config.PONDER_STACK_CONTEXT === "USER" ? config : undefined,
  maintainStack,
  stackIndex: 14,
});

// execSync(
//   `cp -f ./cdk.out/${stack.templateFile} ./resources/dynamoTriggerLambda`
// );
