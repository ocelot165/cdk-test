import * as cdk from "aws-cdk-lib";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import {
  ApplicationListener,
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationTargetGroup,
  ListenerAction,
  ListenerCondition,
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

// 1. New type for the props adding in our configuration
type AwsEnvStackProps = cdk.StackProps & {
  config?: Readonly<ConfigProps>;
  stackIndex: number;
  maintainStack: {
    vpc: Vpc;
    albListener: ApplicationListener;
    alb: ApplicationLoadBalancer;
    db: DatabaseInstance;
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
  githubName: string;
  dockerImageAsset: DockerImageAsset;
  fargateService: FargateService;
  container: ContainerDefinition;
  dbPrefix: string;

  constructor(scope: Construct, id: string, props?: AwsEnvStackProps) {
    super(scope, id, props);

    let config = props?.config || {};

    this.dbPrefix = randomUUID();

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

    this.githubName = config
      ? process.env.GITHUB_NAME!
      : new cdk.CfnParameter(this, "githubName", {
          description: "Version Slug",
          type: "String",
          default: "",
        }).valueAsString;

    this.db = props?.maintainStack.db as DatabaseInstance;
    createDockerImageAsset(this);
    this.vpc = props?.maintainStack.vpc as Vpc;
    createCluster(this);
    createIndexerUsingFargate(this);
    createFargate(this);

    const albListener = props?.maintainStack.albListener as ApplicationListener;

    const targetGroup = new ApplicationTargetGroup(this, "TargetGroup", {
      vpc: this.vpc,
      port: 42069,
      protocol: ApplicationProtocol.HTTP,
      targets: [
        this.fargateService.loadBalancerTarget({
          containerName: this.container.containerName,
          containerPort: 42069,
        }),
      ],
      healthCheck: {
        interval: cdk.Duration.seconds(10),
        path: `/${this.stackName}/readiness`,
        timeout: cdk.Duration.seconds(5),
        port: "42069",
        unhealthyThresholdCount: 5,
      },
      deregistrationDelay: cdk.Duration.seconds(10),
    });

    new cdk.aws_elasticloadbalancingv2.ApplicationListenerRule(
      this,
      `ListenerRule-${randomUUID()}`,
      {
        conditions: [ListenerCondition.pathPatterns([`/${this.stackName}/*`])],
        action: ListenerAction.forward([targetGroup]),
        priority: props?.stackIndex as number,
        listener: albListener,
      }
    );
  }
}
