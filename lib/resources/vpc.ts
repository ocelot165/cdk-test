import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { FlowLogTrafficType } from "aws-cdk-lib/aws-ec2";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

export function createVPC(stack: any, prefix: string, cidr: string) {
  const vpc = new ec2.Vpc(stack, `${prefix}Vpc`, {
    cidr: cidr, //IPs in Range - 65,536
    natGateways: 0,
    createInternetGateway: true,
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

  ec2.SecurityGroup.fromSecurityGroupId(
    stack,
    "DefaultSecurityGroup",
    vpc.vpcDefaultSecurityGroup
  ).addIngressRule(
    ec2.Peer.anyIpv4(),
    ec2.Port.allTraffic(),
    "Allow traffic from anywhere"
  );

  const vpcRole = new iam.Role(stack, `${prefix}RoleVpcFlowLogs`, {
    assumedBy: new iam.ServicePrincipal("vpc-flow-logs.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
    ],
  });

  const logGroup = new logs.LogGroup(stack, `${prefix}VpcFlowLogGroup`, {
    retention: RetentionDays.ONE_MONTH,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });

  new logs.LogStream(stack, `${prefix}VpcFlowLogStream`, {
    logGroup: logGroup,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });

  new ec2.FlowLog(stack, `${prefix}VpcFlowLog`, {
    resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
    destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup, vpcRole),
    trafficType: FlowLogTrafficType.ALL,
  });

  stack.vpc = vpc;

  return vpc;
}
