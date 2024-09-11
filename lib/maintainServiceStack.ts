import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  ApplicationListener,
  ApplicationLoadBalancer,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { createVPC } from "./resources/vpc";
import { DatabaseInstance } from "aws-cdk-lib/aws-rds";
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { createUserFacingLambda } from "./resources/userFacingLambda";
import { createApiGateway } from "./resources/apiGateway";
import { createDynamoTable } from "./resources/dynamo";
import { createDynamoTriggerLambda } from "./resources/dynamoTriggerLambda";
import { createALB } from "./resources/alb";
import { createDb } from "./resources/db";
import { Bucket } from "aws-cdk-lib/aws-s3";

export default class MaintainServiceStack extends cdk.Stack {
  vpc: Vpc;
  alb: ApplicationLoadBalancer;
  albListener: ApplicationListener;
  db: DatabaseInstance;
  userFacingLambda: NodejsFunction;
  apiGateway: RestApi;
  dynamoTable: Table;
  dynamoTriggerLambda: NodejsFunction;
  s3Bucket: Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = createVPC(this, "ControlPlane", "10.0.0.0/16");
    createUserFacingLambda(this);
    createApiGateway(this);
    createDynamoTable(this);
    createDynamoTriggerLambda(this);
    createALB(this);
    createDb(this);

    this.s3Bucket = new Bucket(this, "GithubRepoBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      bucketName: "githubRepoBucket",
    });
  }
}
