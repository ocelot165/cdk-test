import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import {
  CodeStarConnectionsSourceAction,
  GitHubSourceAction,
  GitHubTrigger,
  S3DeployAction,
} from "aws-cdk-lib/aws-codepipeline-actions";
import PonderStack from "../ponderStack";
import {
  CfnParameter,
  RemovalPolicy,
  SecretValue,
  aws_s3_deployment,
} from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ConfigProps } from "../config";
import { CfnGitHubRepository } from "aws-cdk-lib/aws-codestar";
import { GitHubRepository } from "@aws-cdk/aws-codestar-alpha";

export function createGitPipeline(
  stack: PonderStack,
  s3Bucket: Bucket,
  config?: ConfigProps
) {
  const pipeline = new Pipeline(stack, "MyPipeline");
  const sourceOutput = new Artifact();
  const sourceAction = new GitHubSourceAction({
    actionName: "GitHub_Source",
    owner: stack.repoOwnerName,
    repo: stack.repoName,
    oauthToken: config
      ? SecretValue.unsafePlainText(config.GITHUB_TOKEN!)
      : SecretValue.cfnParameter(
          new CfnParameter(stack, "githubToken", {
            description: "Version Slug",
            type: "String",
            default: "",
            noEcho: true,
          })
        ),
    output: sourceOutput,
    branch: "main",
    trigger: GitHubTrigger.POLL,
  });
  pipeline.addStage({
    stageName: "Source",
    actions: [sourceAction],
  });
  pipeline.addStage({
    stageName: "Deploy",
    actions: [
      new S3DeployAction({
        actionName: "DeployAction",
        objectKey: `${stack.stackName.toLowerCase()}-repo`,
        input: sourceOutput,
        bucket: s3Bucket,
        extract: true,
      }),
    ],
  });
  pipeline.applyRemovalPolicy(RemovalPolicy.DESTROY);

  stack.gitPipeline = pipeline;
}
