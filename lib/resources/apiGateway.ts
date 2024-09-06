import { ApiGatewayToLambda } from "@aws-solutions-constructs/aws-apigateway-lambda";
import MaintainServiceStack from "../maintainServiceStack";
import * as cdk from "aws-cdk-lib";

export function createApiGateway(stack: MaintainServiceStack) {
  const { apiGateway } = new ApiGatewayToLambda(
    stack,
    "ApiGatewayToLambdaPattern",
    {
      existingLambdaObj: stack.userFacingLambda,
      apiGatewayProps: {
        vpc: stack.vpc,
        proxy: false,
      },
    }
  );
  const createPonderApi = apiGateway.root.addResource("createPonderService", {
    defaultMethodOptions: {
      authorizationType: cdk.aws_apigateway.AuthorizationType.NONE,
    },
  });

  createPonderApi.addMethod("POST");

  const deletePonderApi = apiGateway.root.addResource("deletePonderService", {
    defaultMethodOptions: {
      authorizationType: cdk.aws_apigateway.AuthorizationType.NONE,
    },
  });
  deletePonderApi.addMethod("POST");

  const getPonderServiceStatus = apiGateway.root.addResource(
    "getPonderServiceStatus",
    {
      defaultMethodOptions: {
        authorizationType: cdk.aws_apigateway.AuthorizationType.NONE,
      },
    }
  );
  getPonderServiceStatus.addMethod("GET");

  stack.apiGateway = apiGateway;
}
