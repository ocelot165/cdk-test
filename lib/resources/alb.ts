import {
  ApplicationLoadBalancer,
  ListenerAction,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as cdk from "aws-cdk-lib";
import MaintainServiceStack from "../maintainServiceStack";

export function createALB(stack: MaintainServiceStack) {
  const alb = new ApplicationLoadBalancer(stack, "AppLoadBalancer", {
    vpc: stack.vpc,
    internetFacing: true,
  });

  stack.alb = alb;

  cdk.Tags.of(alb).add("Context", "ControlPlan");

  const listener = alb.addListener("InboundHttpListener", {
    port: 80,
    open: true,
    defaultAction: ListenerAction.fixedResponse(404, {
      contentType: "text/plain",
      messageBody: "Cannot route your request; no matching project found.",
    }),
  });

  stack.albListener = listener;

  cdk.Tags.of(listener).add("Context", "ControlPlan");
}
