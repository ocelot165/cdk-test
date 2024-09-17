import { LambdaToDynamoDB } from "@aws-solutions-constructs/aws-lambda-dynamodb";
import MaintainServiceStack from "../maintainServiceStack";
import * as cdk from "aws-cdk-lib";
import { SubnetType } from "aws-cdk-lib/aws-ec2";
import {
  AttributeType,
  BillingMode,
  StreamViewType,
} from "aws-cdk-lib/aws-dynamodb";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

export function createDynamoTable(stack: MaintainServiceStack) {
  stack.dynamoTable = new cdk.aws_dynamodb.Table(stack, "ServiceTable", {
    tableName: "serviceTable",
    partitionKey: {
      name: "id",
      type: AttributeType.STRING,
    },
    billingMode: BillingMode.PAY_PER_REQUEST,
    stream: cdk.aws_dynamodb.StreamViewType.NEW_IMAGE,
  });

  stack.userFacingLambda.addToRolePolicy(
    new PolicyStatement({
      actions: ["dynamodb:*"],
      resources: [stack.dynamoTable.tableArn],
    })
  );
  // const { dynamoTable } = new LambdaToDynamoDB(
  //   stack,
  //   "LambdaToDynamoDBPattern",
  //   {
  //     existingLambdaObj: stack.userFacingLambda,
  //     dynamoTableProps: {
  //       deletionProtection: false,
  //       tableName: "serviceTable",
  //       partitionKey: {
  //         name: "id",
  //         type: cdk.aws_dynamodb.AttributeType.STRING,
  //       },
  //       stream: cdk.aws_dynamodb.StreamViewType.NEW_IMAGE,
  //     },
  //     existingVpc: stack.vpc,
  //   }
  // );

  // stack.dynamoTable = dynamoTable;
}
