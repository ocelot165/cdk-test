import { LambdaToDynamoDB } from "@aws-solutions-constructs/aws-lambda-dynamodb";
import MaintainServiceStack from "../maintainServiceStack";
import * as cdk from "aws-cdk-lib";

export function createDynamoTable(stack: MaintainServiceStack) {
  const { dynamoTable } = new LambdaToDynamoDB(
    stack,
    "LambdaToDynamoDBPattern",
    {
      existingLambdaObj: stack.userFacingLambda,
      dynamoTableProps: {
        deletionProtection: false,
        tableName: "serviceTable",
        partitionKey: {
          name: "id",
          type: cdk.aws_dynamodb.AttributeType.STRING,
        },
        stream: cdk.aws_dynamodb.StreamViewType.NEW_IMAGE,
      },
      existingVpc: stack.vpc,
    }
  );

  stack.dynamoTable = dynamoTable;
}
