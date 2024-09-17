import { ApiGatewayToLambda } from "@aws-solutions-constructs/aws-apigateway-lambda";
import MaintainServiceStack from "../maintainServiceStack";
import * as cdk from "aws-cdk-lib";
import { Resource } from "aws-cdk-lib/aws-apigateway";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import {
  HttpApi,
  CorsHttpMethod,
  HttpMethod,
} from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export function createApiGateway(stack: MaintainServiceStack) {
  // Create an API Gateway

  // Define the API Gateway resource
  const apiGateway = new apigateway.LambdaRestApi(stack, "LambdaApi", {
    handler: stack.userFacingLambda,
    proxy: true,
  });
  new apigateway.LambdaIntegration(stack.userFacingLambda);

  //   apiGateway.root.addResource("ponder", {
  //     defaultMethodOptions: {
  //       authorizationType: cdk.aws_apigateway.AuthorizationType.NONE,
  //     },
  //   });
  //   const createPonderApi = apiGateway.root
  //     .getResource("ponder")
  //     ?.addResource("createPonderService", {
  //       defaultMethodOptions: {
  //         authorizationType: cdk.aws_apigateway.AuthorizationType.NONE,
  //       },
  //     }) as Resource;

  //   createPonderApi.addMethod("POST");

  //   const deletePonderApi = apiGateway.root
  //     .getResource("ponder")
  //     ?.addResource("deletePonderService", {
  //       defaultMethodOptions: {
  //         authorizationType: cdk.aws_apigateway.AuthorizationType.NONE,
  //       },
  //     }) as Resource;
  //   deletePonderApi.addMethod("POST");

  //   const getPonderServiceStatus = apiGateway.root
  //     .getResource("ponder")
  //     ?.addResource("getPonderServiceStatus", {
  //       defaultMethodOptions: {
  //         authorizationType: cdk.aws_apigateway.AuthorizationType.NONE,
  //       },
  //     }) as Resource;
  //   getPonderServiceStatus.addMethod("GET");

  //   apiGateway.root.addResource("auth", {
  //     defaultMethodOptions: {
  //       authorizationType: cdk.aws_apigateway.AuthorizationType.NONE,
  //     },
  //   });

  //   const githubApi = apiGateway.root.getResource("auth")?.addResource("github", {
  //     defaultMethodOptions: {
  //       authorizationType: cdk.aws_apigateway.AuthorizationType.NONE,
  //     },
  //   }) as Resource;
  //   githubApi.addMethod("GET");

  //   const githubCallbackApi = apiGateway.root
  //     .getResource("auth")
  //     ?.getResource("github")
  //     ?.addResource("callback", {
  //       defaultMethodOptions: {
  //         authorizationType: cdk.aws_apigateway.AuthorizationType.NONE,
  //       },
  //     }) as Resource;
  //   githubCallbackApi.addMethod("GET");

  stack.apiGateway = apiGateway;
}
