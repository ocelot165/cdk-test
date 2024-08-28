import { LambdaToSqsToLambda } from "@aws-solutions-constructs/aws-lambda-sqs-lambda";
import * as cdk from "aws-cdk-lib";
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class CdkTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // //TODO
    // const { producerLambdaFunction, consumerLambdaFunction, sqsQueue } =
    //   new LambdaToSqsToLambda(this, "LambdaToSqsToLambdaPattern", {
    //     producerLambdaFunctionProps: {
    //       runtime: Runtime.NODEJS_20_X,
    //       handler: "index.handler",
    //       code: Code.fromAsset(`producer-lambda`),
    //     },
    //     consumerLambdaFunctionProps: {
    //       runtime: Runtime.NODEJS_20_X,
    //       handler: "index.handler",
    //       code: Code.fromAsset(`consumer-lambda`),
    //     },
    //   });
  }
}
