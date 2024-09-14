import { Bucket } from "aws-cdk-lib/aws-s3";
import MaintainServiceStack from "../maintainServiceStack";
import { RemovalPolicy } from "aws-cdk-lib";
import { AnyPrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";

export function createS3Bucket(stack: MaintainServiceStack) {
  stack.s3Bucket = new Bucket(stack, "GithubRepoBucket", {
    removalPolicy: RemovalPolicy.DESTROY,
    bucketName: "githubrepobucket",
  });

  const policy = new PolicyStatement({
    actions: ["s3:*"],
    resources: [stack.s3Bucket.arnForObjects("*")],
    principals: [new AnyPrincipal()],
    conditions: {
      StringEquals: {
        "aws:sourceVpc": stack.vpc.vpcId,
      },
    },
  });

  stack.s3Bucket.addToResourcePolicy(policy);
}
