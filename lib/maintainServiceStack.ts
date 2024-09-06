import { LambdaToDynamoDB } from "@aws-solutions-constructs/aws-lambda-dynamodb";
import { ApiGatewayToLambda } from "@aws-solutions-constructs/aws-apigateway-lambda";
import * as cdk from "aws-cdk-lib";
import { DynamoDBStreamsToLambda } from "@aws-solutions-constructs/aws-dynamodbstreams-lambda";
import { Construct } from "constructs";
import path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import {
  ApplicationListener,
  ApplicationLoadBalancer,
  ListenerAction,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Port, Vpc } from "aws-cdk-lib/aws-ec2";
import { createVPC } from "./resources/vpc";
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";

export default class MaintainServiceStack extends cdk.Stack {
  vpc: Vpc;
  alb: ApplicationLoadBalancer;
  albListener: ApplicationListener;
  db: DatabaseInstance;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = createVPC(this, "ControlPlane", "10.0.0.0/16");

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
        vpc: this.vpc,
      },
    });

    const { apiGateway } = new ApiGatewayToLambda(
      this,
      "ApiGatewayToLambdaPattern",
      {
        existingLambdaObj: userFacingLambda,
        apiGatewayProps: {
          vpc: this.vpc,
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

    const { dynamoTable } = new LambdaToDynamoDB(
      this,
      "LambdaToDynamoDBPattern",
      {
        existingLambdaObj: userFacingLambda,
        dynamoTableProps: {
          deletionProtection: false,
          tableName: "serviceTable",
          partitionKey: {
            name: "id",
            type: cdk.aws_dynamodb.AttributeType.STRING,
          },
          stream: cdk.aws_dynamodb.StreamViewType.NEW_IMAGE,
        },
        existingVpc: this.vpc,
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
          vpc: this.vpc,
        },
      }
    );

    new DynamoDBStreamsToLambda(this, "DynamoDbToLambdaPattern", {
      existingLambdaObj: dynamoTriggerLambda,
      existingTableInterface: dynamoTable,
    });

    //@TODO- Granted too many permissions here, only specify whatever is necessary
    dynamoTriggerLambda.role?.addManagedPolicy(
      ManagedPolicy.fromManagedPolicyArn(
        this,
        "FullAccessArnForDynamoTriggerLambda",
        "arn:aws:iam::aws:policy/AWSCloudFormationFullAccess"
      )
    );
    dynamoTriggerLambda.role?.addManagedPolicy(
      ManagedPolicy.fromManagedPolicyArn(
        this,
        "FullSSMArnForDynamoTriggerLambda",
        "arn:aws:iam::aws:policy/AmazonSSMFullAccess"
      )
    );
    dynamoTriggerLambda.role?.addManagedPolicy(
      ManagedPolicy.fromManagedPolicyArn(
        this,
        "FullIAMArnForDynamoTriggerLambda",
        "arn:aws:iam::aws:policy/IAMFullAccess"
      )
    );

    const role = new cdk.aws_iam.Role(this, "MaintainServiceRole", {
      assumedBy: new cdk.aws_iam.ServicePrincipal(
        "cloudformation.amazonaws.com"
      ),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          "PowerUserAccessForServiceRole",
          "arn:aws:iam::aws:policy/PowerUserAccess"
        ),
        ManagedPolicy.fromManagedPolicyArn(
          this,
          "IAMAccessForServiceRole",
          "arn:aws:iam::aws:policy/IAMFullAccess"
        ),
      ],
    });

    const roleArn = role.roleArn;

    dynamoTriggerLambda.addEnvironment("CFM_ROLE_ARN", roleArn);

    const alb = new ApplicationLoadBalancer(this, "AppLoadBalancer", {
      vpc: this.vpc,
      internetFacing: true,
    });

    this.alb = alb;

    cdk.Tags.of(alb).add("Context", "ControlPlan");

    const listener = alb.addListener("InboundHttpListener", {
      port: 80,
      open: true,
      defaultAction: ListenerAction.fixedResponse(404, {
        contentType: "text/plain",
        messageBody: "Cannot route your request; no matching project found.",
      }),
    });

    this.albListener = listener;

    cdk.Tags.of(listener).add("Context", "ControlPlan");

    const db = new DatabaseInstance(this, "IndexedDataDb", {
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11,
      }),
      vpc: this.vpc,
      vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED },
      deletionProtection: false,
      multiAz: false,
      publiclyAccessible: false,
      instanceType: new cdk.aws_ec2.InstanceType("t3.micro"),
      backupRetention: cdk.Duration.days(0),
      monitoringInterval: cdk.Duration.days(0),
      port: 5432,
      databaseName: "ponderDb",
      credentials: Credentials.fromPassword(
        "ponderUser",
        cdk.SecretValue.unsafePlainText("ponderPass")
      ),
      parameters: {
        "rds.force_ssl": "0",
      },
    });

    db.connections.allowFromAnyIpv4(
      Port.allTraffic(),
      "Open port for connection"
    );

    this.db = db;

    new cdk.aws_ssm.StringParameter(this, "listenerRulePriorityput", {
      stringValue: "1",
      parameterName: "listenerRulePriority",
    });
  }
}
