import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";
import MaintainServiceStack from "../maintainServiceStack";
import * as cdk from "aws-cdk-lib";
import { Port } from "aws-cdk-lib/aws-ec2";

export function createDb(stack: MaintainServiceStack) {
  const db = new DatabaseInstance(stack, "IndexedDataDb", {
    engine: DatabaseInstanceEngine.postgres({
      version: PostgresEngineVersion.VER_16,
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

  db.connections.allowFromAnyIpv4(
    Port.allTraffic(),
    "Open port for connection"
  );

  stack.db = db;
}
