import * as cdk from "aws-cdk-lib";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import {
  ApplicationListener,
  ApplicationLoadBalancer,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { createCluster } from "./resources/ecsCluster";
import { createFargate } from "./resources/fargate";
import { createIndexerUsingFargate } from "./resources/indexer";
import { ConfigProps } from "./config";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { createDockerImageAsset } from "./resources/dockerImage";
import { ContainerDefinition, FargateService } from "aws-cdk-lib/aws-ecs";
import { DatabaseInstance } from "aws-cdk-lib/aws-rds";
import { randomUUID } from "crypto";
import { createAlbListenerRule } from "./resources/albListenerRule";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { createGitPipeline } from "./resources/gitPipeline";
import { Pipeline } from "aws-cdk-lib/aws-codepipeline";

type AwsEnvStackProps = cdk.StackProps & {
  config?: Readonly<ConfigProps>;
  stackIndex?: number;
  maintainStack: {
    vpc: Vpc;
    albListener: ApplicationListener;
    alb: ApplicationLoadBalancer;
    db: DatabaseInstance;
    s3Bucket: Bucket;
  };
};

export default class PonderStack extends cdk.Stack {
  vpc: cdk.aws_ec2.Vpc;
  alb: ApplicationLoadBalancer;
  albSg: SecurityGroup;
  cdn: Distribution;
  cluster: cdk.aws_ecs.Cluster;
  githubUrl: string;
  userId: string;
  githubToken: string;
  db: cdk.aws_rds.DatabaseInstance;
  chainId: string;
  rpcUrl: string;
  repoName: string;
  repoOwnerName: string;
  dockerImageAsset: DockerImageAsset;
  fargateService: FargateService;
  container: ContainerDefinition;
  gitPipeline: Pipeline;
  dbPrefix: string;
  stackIndex: number;

  constructor(scope: Construct, id: string, props?: AwsEnvStackProps) {
    super(scope, id, props);

    let config = props?.config || {};

    this.dbPrefix = randomUUID();

    const githubUrl = config
      ? process.env.GITHUB_URL!
      : new cdk.CfnParameter(this, "githubUrl", {
          description: "Version Slug",
          type: "String",
          default: "",
        }).valueAsString;

    const splitUrl = githubUrl.split("/");

    const repoOwnerName = splitUrl[0];
    const repoName = splitUrl[1];

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
          noEcho: true,
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

    this.repoName = repoName;

    this.repoOwnerName = repoOwnerName;

    this.stackIndex =
      typeof props?.stackIndex !== "undefined"
        ? props?.stackIndex
        : Number(
            new cdk.CfnParameter(this, "stackIndex", {
              description: "Version Slug",
              type: "String",
              default: "",
            }).valueAsString
          );

    this.db = props?.maintainStack.db as DatabaseInstance;
    this.vpc = props?.maintainStack.vpc as Vpc;

    createGitPipeline(this, props?.maintainStack.s3Bucket as Bucket, config);
    createDockerImageAsset(this);
    createCluster(this);
    createIndexerUsingFargate(this);
    createFargate(this);
    createAlbListenerRule(
      this,
      props?.maintainStack.albListener as ApplicationListener,
      this.stackIndex
    );
  }
}
