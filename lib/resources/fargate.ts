import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { aws_applicationautoscaling } from "aws-cdk-lib";
import InfraStack from "../ponderStack";

export function createFargate(stack: InfraStack) {
  const role = new iam.Role(stack, "EcsTaskExecutionRole", {
    assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy"
      ),
    ],
  });

  const ecsExecPolicy = new iam.ManagedPolicy(stack, "ECSExecPolicy", {
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

  const taskDefinition = new ecs.TaskDefinition(stack, "ECSTaskDefinition", {
    compatibility: ecs.Compatibility.FARGATE,
    cpu: "256",
    memoryMiB: "512",
    networkMode: ecs.NetworkMode.AWS_VPC,
    taskRole: role,
    runtimePlatform: {
      operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
    },
  });

  const containerLogGroup = new logs.LogGroup(stack, "ContainerLogGroup", {
    retention: logs.RetentionDays.ONE_YEAR,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });

  const splitArn = stack.stackId.split("/");

  const container = taskDefinition.addContainer("ECSContainer", {
    image: ecs.ContainerImage.fromDockerImageAsset(stack.dockerImageAsset),
    logging: ecs.LogDriver.awsLogs({
      streamPrefix: "ponderInstanceLogs",
      logGroup: containerLogGroup,
    }),
    environment: {
      DB_ENDPOINT: `postgresql://ponderUser:ponderPass@${stack.db.dbInstanceEndpointAddress}:${stack.db.dbInstanceEndpointPort}/ponderDb`,
      DATABASE_URL: `postgresql://ponderUser:ponderPass@${stack.db.dbInstanceEndpointAddress}:${stack.db.dbInstanceEndpointPort}/ponderDb`,
      PONDER_INSTANCE_COMMAND: "serve",
      RPC_URL: stack.rpcUrl,
      GITHUB_USERNAME: stack.githubName,
      GITHUB_TOKEN: stack.githubToken,
      GITHUB_URL: stack.githubUrl,
      CHAIN_ID: stack.chainId,
      SCHEMA: `${stack.dbPrefix}-schema`,
      PUBLIC_SCHEMA: `${stack.dbPrefix}-publicSchema`,
      STACK_NAME: stack.stackName,
      BASE_PATH: `/${stack.stackName}`,
    },
    portMappings: [
      { hostPort: 5432, containerPort: 5432 },
      { hostPort: 42069, containerPort: 42069 },
    ],
  });
  container.node.addDependency(...stack.db.node.children);

  container.addPortMappings({ containerPort: 80 });

  stack.container = container;

  const albSg = new ec2.SecurityGroup(stack, "SecurityGroupAlb", {
    vpc: stack.vpc,
    allowAllOutbound: true,
  });

  albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

  albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

  stack.albSg = albSg;

  const ecsSG = new ec2.SecurityGroup(stack, "ECSSecurityGroup", {
    vpc: stack.vpc,
    allowAllOutbound: true,
  });

  ecsSG.addIngressRule(
    ec2.Peer.securityGroupId(stack.albSg.securityGroupId),
    ec2.Port.tcp(80)
  );

  const graphqlService = new ecs.FargateService(stack, "GraphQLService", {
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

  stack.fargateService = graphqlService;

  const scaling = graphqlService.autoScaleTaskCount({
    maxCapacity: 6,
    minCapacity: 1,
  });

  const mathExpressionOptions: cloudwatch.MathExpressionOptions = {
    period: cdk.Duration.minutes(1),
  };

  const scaleDownCpuUtilization = graphqlService.metricCpuUtilization(
    mathExpressionOptions
  );

  scaling.scaleOnMetric("AutoScaleDownCPU", {
    metric: scaleDownCpuUtilization,
    cooldown: cdk.Duration.seconds(120),
    scalingSteps: [
      { upper: 60, change: -2 },
      { upper: 40, change: -2 },
    ],
    evaluationPeriods: 5,
    datapointsToAlarm: 5,
    adjustmentType:
      aws_applicationautoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
  });

  const scaleUpCpuUtilization = graphqlService.metricCpuUtilization(
    mathExpressionOptions
  );

  scaling.scaleOnMetric("AutoScaleUpCPU", {
    metric: scaleUpCpuUtilization,
    cooldown: cdk.Duration.seconds(120),
    scalingSteps: [
      { lower: 60, change: +2 },
      { lower: 80, change: +2 },
    ],
    adjustmentType:
      aws_applicationautoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
  });
}
