import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { FlowLogTrafficType } from "aws-cdk-lib/aws-ec2";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import ponderStack from "../ponderStack";

export function createVPC(stack: ponderStack) {
  const vpc = new ec2.Vpc(stack, "Vpc", {
    cidr: "10.30.0.0/16", //IPs in Range - 65,536
    natGateways: 3,
    maxAzs: 3,
    subnetConfiguration: [
      {
        name: "Public",
        subnetType: ec2.SubnetType.PUBLIC,
        cidrMask: 24, //IPs in Range - 256
      },
      {
        name: "Private",
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        cidrMask: 24, //IPs in Range - 256
      },
      {
        cidrMask: 24,
        name: "PrivateIsolated",
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    ],
  });

  const vpcRole = new iam.Role(stack, "RoleVpcFlowLogs", {
    assumedBy: new iam.ServicePrincipal("vpc-flow-logs.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
    ],
  });

  const logGroup = new logs.LogGroup(stack, "VpcFlowLogGroup", {
    retention: RetentionDays.ONE_MONTH,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });

  const logStream = new logs.LogStream(stack, "VpcFlowLogStream", {
    logGroup: logGroup,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });

  const flowLogs = new ec2.FlowLog(stack, "VpcFlowLog", {
    resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
    destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup, vpcRole),
    trafficType: FlowLogTrafficType.ALL,
  });

  stack.vpc = vpc;

  return vpc;
}
