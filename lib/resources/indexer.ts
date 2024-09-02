import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import InfraStack from "../ponderStack";
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";
import { Dependable } from "constructs";
import { Repository } from "aws-cdk-lib/aws-ecr";

export function createIndexerUsingFargate(stack: InfraStack) {
  const db = new DatabaseInstance(stack, "IndexedDataDb", {
    engine: DatabaseInstanceEngine.postgres({
      version: PostgresEngineVersion.VER_11,
    }),
    vpc: stack.vpc,
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

  stack.db = db;

  db.connections.allowFromAnyIpv4(
    ec2.Port.allTraffic(),
    "Open port for connection"
  );

  const role = new iam.Role(stack, "IndexerEcsTaskExecutionRole", {
    assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy"
      ),
    ],
  });

  const ecsExecPolicy = new iam.ManagedPolicy(stack, "IndexerECSExecPolicy", {
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel",
        ],
        resources: ["*"],
      }),
      // new iam.PolicyStatement({
      //   effect: iam.Effect.ALLOW,
      //   actions: ["s3:PutObject"],
      //   resources: [`${stack.execBucket.bucketArn}/*`],
      // }),
      // new iam.PolicyStatement({
      //   effect: iam.Effect.ALLOW,
      //   actions: ["s3:GetEncryptionConfiguration"],
      //   resources: [stack.execBucket.bucketArn],
      // }),
      // new iam.PolicyStatement({
      //   effect: iam.Effect.ALLOW,
      //   actions: ["kms:Decrypt"],
      //   resources: [stack.kmsKey.keyArn],
      // }),
    ],
  });

  role.addManagedPolicy(ecsExecPolicy);

  const taskDefinition = new ecs.TaskDefinition(
    stack,
    "IndexerECSTaskDefinition",
    {
      compatibility: ecs.Compatibility.FARGATE,
      cpu: "256",
      memoryMiB: "512",
      networkMode: ecs.NetworkMode.AWS_VPC,
      taskRole: role,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    }
  );

  const containerLogGroup = new logs.LogGroup(
    stack,
    "IndexerContainerLogGroup",
    {
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    }
  );

  const container = taskDefinition.addContainer("IndexerECSContainer", {
    image: ecs.ContainerImage.fromDockerImageAsset(stack.dockerImageAsset),
    logging: ecs.LogDriver.awsLogs({
      streamPrefix: "ponderInstanceLogs",
      logGroup: containerLogGroup,
    }),
    // linuxParameters: new ecs.LinuxParameters(stack, "IndexerNodeExec", {
    //   initProcessEnabled: true,
    // }),
    environment: {
      DB_ENDPOINT: `postgresql://ponderUser:ponderPass@${stack.db.dbInstanceEndpointAddress}:${stack.db.dbInstanceEndpointPort}/ponderDb`,
      DATABASE_URL: `postgresql://ponderUser:ponderPass@${stack.db.dbInstanceEndpointAddress}:${stack.db.dbInstanceEndpointPort}/ponderDb`,
      PONDER_INSTANCE_COMMAND: "start",
      RPC_URL: stack.rpcUrl,
      GITHUB_USERNAME: stack.githubName,
      GITHUB_TOKEN: stack.githubToken,
      GITHUB_URL: stack.githubUrl,
      CHAIN_ID: stack.chainId,
    },
    portMappings: [{ hostPort: 5432, containerPort: 5432 }],
  });

  container.node.addDependency(...db.node.children);

  container.addPortMappings({ containerPort: 80 });

  const ecsSG = new ec2.SecurityGroup(stack, "IndexerECSSecurityGroup", {
    vpc: stack.vpc,
    allowAllOutbound: true,
  });

  ecsSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

  const indexerService = new ecs.FargateService(stack, "IndexerECSService", {
    cluster: stack.cluster,
    taskDefinition,
    desiredCount: 1,
    securityGroups: [ecsSG],
    minHealthyPercent: 100,
    maxHealthyPercent: 200,
    assignPublicIp: true,
    // healthCheckGracePeriod: cdk.Duration.seconds(60),
    enableExecuteCommand: true,
    vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PUBLIC },
  });

  indexerService.node.addDependency(...db.node.children);

  db.connections.connections.allowFrom(indexerService, ec2.Port.POSTGRES);
}
