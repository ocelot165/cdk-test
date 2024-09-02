import * as cdk from "aws-cdk-lib";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import InfraStack from "../ponderStack";

export function createECSExec(stack: InfraStack) {
  const kmsKey = new kms.Key(stack, "ECSExecKmsKey", {
    enableKeyRotation: true,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });

  const s3Bucket = new s3.Bucket(stack, "ECSExecBucket", {
    encryptionKey: kmsKey,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  });

  // stack.kmsKey = kmsKey;
  // stack.execBucket = s3Bucket;

  const execDep = {
    kmsKey: kmsKey,
    execBucket: s3Bucket,
  };

  return execDep;
}
