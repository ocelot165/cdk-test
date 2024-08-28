#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import InfraStack from "../lib/ponderStack";

const app = new cdk.App();
new InfraStack(app, "PonderStack", {
  env: { region: "us-east-1" },
});
