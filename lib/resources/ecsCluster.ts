import * as ecs from "aws-cdk-lib/aws-ecs";
import InfraStack from "../ponderStack";

export function createCluster(stack: InfraStack) {
  const cluster = new ecs.Cluster(stack, "DemoCluster", {
    vpc: stack.vpc,
    containerInsights: true,
    // executeCommandConfiguration: {
    //   kmsKey: stack.kmsKey,
    //   logConfiguration: {
    //     s3Bucket: stack.execBucket,
    //     s3EncryptionEnabled: true,
    //     s3KeyPrefix: "exec-command-output",
    //   },
    //   logging: ecs.ExecuteCommandLogging.OVERRIDE,
    // },
  });

  stack.cluster = cluster;

  return cluster;
}
