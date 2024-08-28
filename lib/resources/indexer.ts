import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import InfraStack from "../ponderStack";
import { DatabaseInstance, DatabaseInstanceEngine } from "aws-cdk-lib/aws-rds";

export function createIndexerUsingFargate(stack: InfraStack) {
  const db = new DatabaseInstance(stack, "IndexedDataDb", {
    engine: DatabaseInstanceEngine.POSTGRES,
    vpc: stack.vpc,
    vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS },
    deletionProtection: true,
    multiAz: false,
    publiclyAccessible: false,
  });

  db.connections.allowFromAnyIpv4(
    ec2.Port.tcp(5432),
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
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:PutObject"],
        resources: [`${stack.execBucket.bucketArn}/*`],
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetEncryptionConfiguration"],
        resources: [stack.execBucket.bucketArn],
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["kms:Decrypt"],
        resources: [stack.kmsKey.keyArn],
      }),
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
    image: ecs.ContainerImage.fromRegistry("nginx:latest"),
    logging: ecs.LogDriver.awsLogs({
      streamPrefix: "demoLogs",
      logGroup: containerLogGroup,
    }),
    linuxParameters: new ecs.LinuxParameters(stack, "IndexerNodeExec", {
      initProcessEnabled: true,
    }),
  });

  container.addPortMappings({ containerPort: 80 });

  const ecsSG = new ec2.SecurityGroup(stack, "IndexerECSSecurityGroup", {
    vpc: stack.vpc,
    allowAllOutbound: true,
  });

  ecsSG.addIngressRule(
    ec2.Peer.securityGroupId(stack.albSg.securityGroupId),
    ec2.Port.tcp(80)
  );

  new ecs.FargateService(stack, "IndexerECSService", {
    cluster: stack.cluster,
    taskDefinition,
    desiredCount: 1,
    securityGroups: [ecsSG],
    minHealthyPercent: 100,
    maxHealthyPercent: 200,
    assignPublicIp: false,
    healthCheckGracePeriod: cdk.Duration.seconds(60),
    enableExecuteCommand: true,
    vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PUBLIC },
  });
}
