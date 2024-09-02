import { LambdaToDynamoDB } from "@aws-solutions-constructs/aws-lambda-dynamodb";
import { ApiGatewayToLambda } from "@aws-solutions-constructs/aws-apigateway-lambda";
import * as cdk from "aws-cdk-lib";
import { DynamoDBStreamsToLambda } from "@aws-solutions-constructs/aws-dynamodbstreams-lambda";
import { Construct } from "constructs";
import path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";

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

    const { apiGateway } = new ApiGatewayToLambda(
      this,
      "ApiGatewayToLambdaPattern",
      {
        existingLambdaObj: userFacingLambda,
        apiGatewayProps: {
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
  }
}
