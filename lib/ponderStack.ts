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

export default class PonderStack extends cdk.Stack {
  vpc: cdk.aws_ec2.Vpc;
  alb: ApplicationLoadBalancer;
  albSg: SecurityGroup;
  cdn: Distribution;
  kmsKey: cdk.aws_kms.Key;
  execBucket: cdk.aws_s3.Bucket;
  cluster: cdk.aws_ecs.Cluster;
  accessToken: string;
  githubUrl: string;
  userId: string;
  githubToken: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.accessToken = new cdk.CfnParameter(this, "version", {
      description: "Version Slug",
      type: "String",
      default: "",
    }).valueAsString;

    this.githubUrl = new cdk.CfnParameter(this, "githubUrl", {
      description: "Version Slug",
      type: "String",
      default: "",
    }).valueAsString;

    this.userId = new cdk.CfnParameter(this, "userId", {
      description: "Version Slug",
      type: "String",
      default: "",
    }).valueAsString;

    this.githubToken = new cdk.CfnParameter(this, "githubToken", {
      description: "Version Slug",
      type: "String",
      default: "",
    }).valueAsString;

    createVPC(this);
    createALB(this);
    createCDN(this);
    createECSExec(this);
    createCluster(this);
    createIndexerUsingFargate(this);
    createFargate(this);
  }
}
