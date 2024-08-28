import * as AWS from "aws-sdk";
import { Handler, SQSEvent, SQSRecord } from "aws-lambda";
import {
  CloudFormationClient,
  CreateStackCommand,
  CreateStackCommandInput,
} from "@aws-sdk/client-cloudformation";
import { SQSMessage } from "../types";
import PonderStack from "../cdk.out/PonderStack.template.json";

AWS.config.update({ region: "us-east-1" });

export const handler: Handler = async (event: SQSEvent) => {
  for (const message of event.Records) {
    await createStackAsync(message);
  }
};

async function createStackAsync(message: SQSRecord) {
  try {
    const body: SQSMessage = JSON.parse(message.body);
    const client = new CloudFormationClient({});
    const stackName = `${body.userId}-${body.githubUrl}-${body.versionSlug}`;
    const input: CreateStackCommandInput = {
      StackName: stackName,
      TemplateBody: JSON.stringify(PonderStack),
      Parameters: [
        {
          ParameterKey: "version",
          ParameterValue: body.versionSlug,
          UsePreviousValue: false,
        },
        {
          ParameterKey: "githubUrl",
          ParameterValue: body.githubUrl,
          UsePreviousValue: false,
        },
        {
          ParameterKey: "userId",
          ParameterValue: body.userId,
          UsePreviousValue: false,
        },
      ],
      DisableRollback: false,
      Capabilities: [
        "CAPABILITY_IAM",
        "CAPABILITY_NAMED_IAM",
        "CAPABILITY_AUTO_EXPAND",
      ],
      ResourceTypes: ["AWS::*"],
      OnFailure: "ROLLBACK",
      EnableTerminationProtection: true,
    };
    const command = new CreateStackCommand(input);
    const response = await client.send(command);
    console.log("Created Stack ID :", response?.StackId);
  } catch (err) {
    console.error("An error occurred");
    throw err;
  }
}
