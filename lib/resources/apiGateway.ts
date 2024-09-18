import MaintainServiceStack from "../maintainServiceStack";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export function createApiGateway(stack: MaintainServiceStack) {
  const apiGateway = new apigateway.LambdaRestApi(stack, "LambdaApi", {
    handler: stack.userFacingLambda,
    proxy: true,
  });
  new apigateway.LambdaIntegration(stack.userFacingLambda);

  stack.apiGateway = apiGateway;
}
