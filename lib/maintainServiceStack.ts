import { LambdaToDynamoDB } from "@aws-solutions-constructs/aws-lambda-dynamodb";
import { ApiGatewayToLambda } from "@aws-solutions-constructs/aws-apigateway-lambda";
import * as cdk from "aws-cdk-lib";
import { DynamoDBStreamsToLambda } from "@aws-solutions-constructs/aws-dynamodbstreams-lambda";
import { Construct } from "constructs";
import path from "path";

export class MaintainServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { lambdaFunction: userFacingLambda, apiGateway } =
      new ApiGatewayToLambda(this, "ApiGatewayToLambdaPattern", {
        lambdaFunctionProps: {
          runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
          handler: "index.handler",
          code: cdk.aws_lambda.Code.fromAsset(
            path.join(__dirname, "..", "resources", "maintainServiceApi.ts")
          ),
        },
      });

    const createPonderApi = apiGateway.root.addResource("createPonderService");
    createPonderApi.addMethod("POST");

    const deletePonderApi = apiGateway.root.addResource("deletePonderService");
    deletePonderApi.addMethod("POST");

    const getPonderServiceStatus = apiGateway.root.addResource(
      "getPonderServiceStatus"
    );
    getPonderServiceStatus.addMethod("GET");

    const { dynamoTable } = new LambdaToDynamoDB(
      this,
      "LambdaToDynamoDBPattern",
      {
        existingLambdaObj: userFacingLambda,
      }
    );

    new DynamoDBStreamsToLambda(this, "DynamoDbToLambdaPattern", {
      lambdaFunctionProps: {
        code: cdk.aws_lambda.Code.fromAsset(
          path.join(__dirname, "..", "resources", "createService.ts")
        ),
        runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
      },
      existingTableInterface: dynamoTable,
    });
  }
}
