import * as ecs from "aws-cdk-lib/aws-ecs";
import InfraStack from "../ponderStack";

export function createCluster(stack: InfraStack) {
  const cluster = new ecs.Cluster(stack, "DemoCluster", {
    vpc: stack.vpc,
    containerInsights: true,
  });

  stack.cluster = cluster;

  return cluster;
}
