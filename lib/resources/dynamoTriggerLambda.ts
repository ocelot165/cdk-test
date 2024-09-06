import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import MaintainServiceStack from "../maintainServiceStack";
import path from "path";
import * as cdk from "aws-cdk-lib";
import { DynamoDBStreamsToLambda } from "@aws-solutions-constructs/aws-dynamodbstreams-lambda";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";

export function createDynamoTriggerLambda(stack: MaintainServiceStack) {
  const dynamoTriggerLambda = new NodejsFunction(stack, "DynamoTriggerLambda", {
    entry: path.join(
      __dirname,
      "..",
      "..",
      "resources",
      "dynamoTriggerLambda",
      "index.ts"
    ),
    ...{
      depsLockFilePath: path.join(
        __dirname,
        "..",
        "resources",
        "dynamoTriggerLambda",
        "package-lock.json"
      ),
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      vpc: stack.vpc,
    },
  });

  stack.dynamoTriggerLambda = dynamoTriggerLambda;

  new DynamoDBStreamsToLambda(stack, "DynamoDbToLambdaPattern", {
    existingLambdaObj: dynamoTriggerLambda,
    existingTableInterface: stack.dynamoTable,
  });

  //@TODO- Granted too many permissions here, only specify whatever is necessary
  dynamoTriggerLambda.role?.addManagedPolicy(
    ManagedPolicy.fromManagedPolicyArn(
      stack,
      "FullAccessArnForDynamoTriggerLambda",
      "arn:aws:iam::aws:policy/AWSCloudFormationFullAccess"
    )
  );
  dynamoTriggerLambda.role?.addManagedPolicy(
    ManagedPolicy.fromManagedPolicyArn(
      stack,
      "FullSSMArnForDynamoTriggerLambda",
      "arn:aws:iam::aws:policy/AmazonSSMFullAccess"
    )
  );
  dynamoTriggerLambda.role?.addManagedPolicy(
    ManagedPolicy.fromManagedPolicyArn(
      stack,
      "FullIAMArnForDynamoTriggerLambda",
      "arn:aws:iam::aws:policy/IAMFullAccess"
    )
  );

  const role = new cdk.aws_iam.Role(stack, "MaintainServiceRole", {
    assumedBy: new cdk.aws_iam.ServicePrincipal("cloudformation.amazonaws.com"),
    managedPolicies: [
      ManagedPolicy.fromManagedPolicyArn(
        stack,
        "PowerUserAccessForServiceRole",
        "arn:aws:iam::aws:policy/PowerUserAccess"
      ),
      ManagedPolicy.fromManagedPolicyArn(
        stack,
        "IAMAccessForServiceRole",
        "arn:aws:iam::aws:policy/IAMFullAccess"
      ),
    ],
  });

  dynamoTriggerLambda.addEnvironment("CFM_ROLE_ARN", role.roleArn);
}
