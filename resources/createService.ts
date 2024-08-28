import * as AWS from "aws-sdk";
import { DynamoDBRecord, DynamoDBStreamEvent, Handler } from "aws-lambda";
import {
  CloudFormationClient,
  CreateStackCommand,
  CreateStackCommandInput,
  DeleteStackCommand,
  DeleteStackCommandInput,
} from "@aws-sdk/client-cloudformation";
import PonderStack from "../cdk.out/PonderStack.template.json";

AWS.config.update({ region: "us-east-1" });

const client = new CloudFormationClient({});

export const handler: Handler = async (event: DynamoDBStreamEvent) => {
  for (const message of event.Records) {
    const event = message.eventName;
    if (event === "INSERT") {
      await createStackAsync(message);
    } else if (event === "REMOVE") {
      await deleteStackAsync(message);
    }
  }
};

async function createStackAsync(message: DynamoDBRecord) {
  try {
    if (!message.dynamodb?.Keys) throw new Error("No Data exists on record");
    const userId: string = message.dynamodb.Keys["userId"].S as string;
    const githubUrl: string = message.dynamodb.Keys["githubUrl"].S as string;
    const versionSlug: string = message.dynamodb.Keys["versionSlug"]
      .S as string;
    const body = {
      userId,
      githubUrl,
      versionSlug,
    };
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
    console.log("Creating Stack with ID :", response?.StackId);
  } catch (err) {
    console.error("An error occurred");
    throw err;
  }
}

async function deleteStackAsync(message: DynamoDBRecord) {
  try {
    if (!message.dynamodb?.Keys) throw new Error("No Data exists on record");
    const userId: string = message.dynamodb.Keys["userId"].S as string;
    const githubUrl: string = message.dynamodb.Keys["githubUrl"].S as string;
    const versionSlug: string = message.dynamodb.Keys["versionSlug"]
      .S as string;
    const body = {
      userId,
      githubUrl,
      versionSlug,
    };
    const stackName = `${body.userId}-${body.githubUrl}-${body.versionSlug}`;
    const input: DeleteStackCommandInput = {
      StackName: stackName,
      DeletionMode: "FORCE_DELETE_STACK",
    };
    const command = new DeleteStackCommand(input);
    await client.send(command);
    console.log("Deleting Stack with ID :", stackName);
  } catch (err) {
    console.error("An error occurred");
    throw err;
  }
}
