import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
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

  const container = taskDefinition.addContainer("ECSContainer", {
    image: ecs.ContainerImage.fromRegistry("timbru31/node-alpine-git:latest"),
    logging: ecs.LogDriver.awsLogs({
      streamPrefix: "ponderInstanceLogs",
      logGroup: containerLogGroup,
    }),
    linuxParameters: new ecs.LinuxParameters(stack, "NodeExec", {
      initProcessEnabled: true,
    }),
    environment: {
      DB_ENDPOINT: stack.db.instanceEndpoint.socketAddress,
    },
    entryPoint: ["sh", "-c"],
    command: [
      `git clone https://oauth2:${stack.githubToken}@github.com/${stack.githubUrl} ponderInstance && cd ponderInstance && ls && touch .env.local && echo "PONDER_RPC_URL_${stack.chainId}=${stack.rpcUrl}" >> .env.local && echo "DATABASE_URL=${stack.db.instanceEndpoint.socketAddress}" >> .env.local && npm i && npm run serve`,
    ],
  });

  container.addPortMappings({ containerPort: 80 });

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

  const service =
    new cdk.aws_ecs_patterns.ApplicationLoadBalancedFargateService(
      stack,
      "ECSService",
      {
        cluster: stack.cluster,
        taskDefinition,
        desiredCount: 1,
        minHealthyPercent: 100,
        maxHealthyPercent: 200,
        assignPublicIp: true,
        healthCheckGracePeriod: cdk.Duration.seconds(60),
        enableExecuteCommand: true,
        taskSubnets: { subnetType: cdk.aws_ec2.SubnetType.PUBLIC },
        securityGroups: [ecsSG],
        protocol: elbv2.ApplicationProtocol.HTTP,
        // healthCheck: {
        //   healthyThresholdCount: 2,
        //   unhealthyThresholdCount: 3,
        //   interval: cdk.Duration.seconds(10),
        //   timeout: cdk.Duration.seconds(5),
        //   healthyHttpCodes: "200",
        // },
      }
    );

  stack.alb = service.loadBalancer;

  stack.alb.addSecurityGroup(albSg);

  const scaling = service.service.autoScaleTaskCount({
    maxCapacity: 6,
    minCapacity: 1,
  });

  const mathExpressionOptions: cloudwatch.MathExpressionOptions = {
    period: cdk.Duration.minutes(1),
  };

  const scaleDownCpuUtilization = service.service.metricCpuUtilization(
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

  const scaleUpCpuUtilization = service.service.metricCpuUtilization(
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

  // const targetGroup = new elbv2.ApplicationTargetGroup(stack, "TargetGroup", {
  //   targets: [service.service],
  //   protocol: elbv2.ApplicationProtocol.HTTP,
  //   vpc: stack.vpc,
  //   port: 80,
  //   deregistrationDelay: cdk.Duration.seconds(30),
  //   healthCheck: {
  //     path: "/health",
  //     healthyThresholdCount: 2,
  //     unhealthyThresholdCount: 3,
  //     interval: cdk.Duration.seconds(10),
  //     timeout: cdk.Duration.seconds(5),
  //     healthyHttpCodes: "200",
  //   },
  // });

  // service.listener.addTargets("reeee343", {
  //   port: 80,
  //   healthCheck: {
  //     path: "/health",
  //     healthyThresholdCount: 2,
  //     unhealthyThresholdCount: 3,
  //     interval: cdk.Duration.seconds(10),
  //     timeout: cdk.Duration.seconds(5),
  //     healthyHttpCodes: "200",
  //   },
  //   targets: [service.service],
  // });

  // targetGroup.node.addDependency(service.loadBalancer.listeners[0]);
  // service.service.node.addDependency(service.loadBalancer);

  // service.listener.addTargetGroups("target-group", {
  //   targetGroups: [targetGroup],
  // });

  // targetGroup.node.addDependency(service.loadBalancer);
  // service.service.node.addDependency(service.loadBalancer);
  // service.service.node.addDependency(service.loadBalancer.listeners[0]);
  // // const httpslistener = stack.alb.addListener("HttpsListener", {
  // //   port: 80,
  // //   open: true,
  // //   // certificates: [anCert],
  // // });

  // service.listener.addAction("HttpsDefaultAction", {
  //   action: elbv2.ListenerAction.forward([targetGroup]),
  // });
}
