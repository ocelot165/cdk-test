import { LambdaToDynamoDB } from "@aws-solutions-constructs/aws-lambda-dynamodb";
import { ApiGatewayToLambda } from "@aws-solutions-constructs/aws-apigateway-lambda";
import * as cdk from "aws-cdk-lib";
import { DynamoDBStreamsToLambda } from "@aws-solutions-constructs/aws-dynamodbstreams-lambda";
import { Construct } from "constructs";
import path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class MaintainServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userFacingLambda = new NodejsFunction(this, "UserFacingLambda", {
      entry: path.join(
        __dirname,
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
      },
    });

    new ApiGatewayToLambda(this, "ApiGatewayToLambdaPattern", {
      existingLambdaObj: userFacingLambda,
      apiGatewayProps: {
        proxy: true,
      },
    });

    const { dynamoTable } = new LambdaToDynamoDB(
      this,
      "LambdaToDynamoDBPattern",
      {
        existingLambdaObj: userFacingLambda,
        dynamoTableProps: {
          tableName: "serviceTable",
          partitionKey: {
            name: "id",
            type: cdk.aws_dynamodb.AttributeType.STRING,
          },
          stream: cdk.aws_dynamodb.StreamViewType.NEW_IMAGE,
        },
      }
    );

    const dynamoTriggerLambda = new NodejsFunction(
      this,
      "DynamoTriggerLambda",
      {
        entry: path.join(
          __dirname,
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
        },
      }
    );

    new DynamoDBStreamsToLambda(this, "DynamoDbToLambdaPattern", {
      existingLambdaObj: dynamoTriggerLambda,
      existingTableInterface: dynamoTable,
    });
  }
}
