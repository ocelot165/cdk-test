import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import InfraStack from "../ponderStack";

export function createIndexerUsingFargate(stack: InfraStack) {
  const role = new iam.Role(stack, "IndexerEcsTaskExecutionRole", {
    assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy"
      ),
    ],
  });

  role.addManagedPolicy(
    iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")
  );

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
    environment: {
      DB_ENDPOINT: `postgresql://ponderUser:ponderPass@${stack.db.dbInstanceEndpointAddress}:${stack.db.dbInstanceEndpointPort}/ponderDb`,
      DATABASE_URL: `postgresql://ponderUser:ponderPass@${stack.db.dbInstanceEndpointAddress}:${stack.db.dbInstanceEndpointPort}/ponderDb`,
      PONDER_INSTANCE_COMMAND: "start",
      RPC_URL: stack.rpcUrl,
      GITHUB_USERNAME: stack.repoOwnerName,
      GITHUB_TOKEN: stack.githubToken,
      GITHUB_URL: `${stack.repoOwnerName}/${stack.repoName}`,
      CHAIN_ID: stack.chainId,
      SCHEMA: `${stack.dbPrefix}-schema`,
      PUBLIC_SCHEMA: `${stack.dbPrefix}-publicSchema`,
      BASE_PATH: `/PonderStack${stack.stackIndex}`,
      STACK_NAME: `PonderStack${stack.stackIndex}`.toLowerCase(),
    },
    portMappings: [{ hostPort: 5432, containerPort: 5432 }],
  });

  container.node.addDependency(...stack.db.node.children);

  container.addPortMappings({ containerPort: 80 });

  const ecsSG = new ec2.SecurityGroup(stack, "IndexerECSSecurityGroup", {
    vpc: stack.vpc,
    allowAllOutbound: true,
  });

  ecsSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

  const ecsService = new ecs.FargateService(stack, "IndexerECSService", {
    cluster: stack.cluster,
    taskDefinition,
    desiredCount: 1,
    securityGroups: [ecsSG],
    minHealthyPercent: 100,
    maxHealthyPercent: 200,
    assignPublicIp: true,
    enableExecuteCommand: true,
    vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PUBLIC },
  });

  ecsService.node.addDependency(stack.gitPipeline);
}
