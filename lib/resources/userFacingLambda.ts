import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import MaintainServiceStack from "../maintainServiceStack";
import path from "path";
import * as cdk from "aws-cdk-lib";

export function createUserFacingLambda(stack: MaintainServiceStack) {
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
        "resources",
        "maintainServiceApi",
        "package-lock.json"
      ),
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      vpc: stack.vpc,
    },
  });
}
