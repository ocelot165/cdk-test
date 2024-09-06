import {
  ApplicationListener,
  ApplicationProtocol,
  ApplicationTargetGroup,
  ListenerAction,
  ListenerCondition,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import PonderStack from "../ponderStack";
import { randomUUID } from "crypto";
import * as cdk from "aws-cdk-lib";

export function createAlbListenerRule(
  stack: PonderStack,
  albListener: ApplicationListener,
  stackIndex: number
) {
  const targetGroup = new ApplicationTargetGroup(stack, "TargetGroup", {
    vpc: stack.vpc,
    port: 42069,
    protocol: ApplicationProtocol.HTTP,
    targets: [
      stack.fargateService.loadBalancerTarget({
        containerName: stack.container.containerName,
        containerPort: 42069,
      }),
    ],
    healthCheck: {
      interval: cdk.Duration.seconds(10),
      path: `/${stack.stackName}/readiness`,
      timeout: cdk.Duration.seconds(5),
      port: "42069",
      unhealthyThresholdCount: 5,
    },
    deregistrationDelay: cdk.Duration.seconds(10),
  });

  new cdk.aws_elasticloadbalancingv2.ApplicationListenerRule(
    stack,
    `ListenerRule-${randomUUID()}`,
    {
      conditions: [ListenerCondition.pathPatterns([`/${stack.stackName}/*`])],
      action: ListenerAction.forward([targetGroup]),
      priority: stackIndex,
      listener: albListener,
    }
  );
}