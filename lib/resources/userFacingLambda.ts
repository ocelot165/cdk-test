import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import MaintainServiceStack from "../maintainServiceStack";
import path from "path";
import * as cdk from "aws-cdk-lib";
import { getLambdaConfig } from "../config";

export function createUserFacingLambda(stack: MaintainServiceStack) {
  const lambdaConfig = getLambdaConfig();

  stack.userFacingLambda = new NodejsFunction(stack, "UserFacingLambda", {
    entry: path.join(
      __dirname,
      "..",
      "..",
      "resources",
      "maintainServiceApi",
      "index.ts"
    ),
    ...{
      depsLockFilePath: path.join(
        __dirname,
        "..",
        "..",
        "resources",
        "maintainServiceApi",
        "index.ts"
      ),
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        ...lambdaConfig,
      },
      memorySize: 1024,
    },
  });
}
