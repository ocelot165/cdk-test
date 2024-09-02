import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import InfraStack from "../ponderStack";
import { DockerImageAsset, Platform } from "aws-cdk-lib/aws-ecr-assets";
import path from "path";

export function createDockerImageAsset(stack: InfraStack) {
  stack.dockerImageAsset = new DockerImageAsset(stack, "PonderBuildImage", {
    directory: path.join(__dirname, "..", "..", "resources", "containers"),
    platform: Platform.LINUX_AMD64,
  });
}
