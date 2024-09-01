import * as cdk from "aws-cdk-lib";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { ApplicationLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { createVPC } from "./resources/vpc";
import { createALB } from "./resources/alb";
import { createCDN } from "./resources/cdn";
import { createCluster } from "./resources/ecsCluster";
import { createECSExec } from "./resources/encryption";
import { createFargate } from "./resources/fargate";
import { createIndexerUsingFargate } from "./resources/indexer";
import { ConfigProps } from "./config";

// 1. New type for the props adding in our configuration
type AwsEnvStackProps = cdk.StackProps & {
  config?: Readonly<ConfigProps>;
};

export default class PonderStack extends cdk.Stack {
  vpc: cdk.aws_ec2.Vpc;
  alb: ApplicationLoadBalancer;
  albSg: SecurityGroup;
  cdn: Distribution;
  kmsKey: cdk.aws_kms.Key;
  execBucket: cdk.aws_s3.Bucket;
  cluster: cdk.aws_ecs.Cluster;
  githubUrl: string;
  userId: string;
  githubToken: string;
  db: cdk.aws_rds.DatabaseInstance;
  chainId: string;
  rpcUrl: string;

  constructor(scope: Construct, id: string, props?: AwsEnvStackProps) {
    super(scope, id, props);

    let config = props?.config || {};

    this.githubUrl = config
      ? process.env.GITHUB_URL!
      : new cdk.CfnParameter(this, "githubUrl", {
          description: "Version Slug",
          type: "String",
          default: "",
        }).valueAsString;

    this.userId = config
      ? process.env.USER_ID!
      : new cdk.CfnParameter(this, "userId", {
          description: "Version Slug",
          type: "String",
          default: "",
        }).valueAsString;

    this.githubToken = config
      ? process.env.GITHUB_TOKEN!
      : new cdk.CfnParameter(this, "githubToken", {
          description: "Version Slug",
          type: "String",
          default: "",
        }).valueAsString;

    this.chainId = config
      ? process.env.CHAIN_ID!
      : new cdk.CfnParameter(this, "chainId", {
          description: "Version Slug",
          type: "String",
          default: "",
        }).valueAsString;

    this.rpcUrl = config
      ? process.env.RPC_URL!
      : new cdk.CfnParameter(this, "rpcUrl", {
          description: "Version Slug",
          type: "String",
          default: "",
        }).valueAsString;

    createECSExec(this);
    createVPC(this);
    // createALB(this);
    createCluster(this);
    createIndexerUsingFargate(this);
    createFargate(this);
    // createCDN(this);
  }
}
