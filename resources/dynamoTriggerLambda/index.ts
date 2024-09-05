import * as AWS from "aws-sdk";
import { DynamoDBRecord, DynamoDBStreamEvent, Handler } from "aws-lambda";
import {
  CloudFormationClient,
  CreateStackCommand,
  CreateStackCommandInput,
  DeleteStackCommand,
  DeleteStackCommandInput,
} from "@aws-sdk/client-cloudformation";
import PonderStack from "./in/PonderStack.template.json";

const client = new CloudFormationClient({});

export const handler: Handler = async (event: DynamoDBStreamEvent) => {
  for (const message of event.Records) {
    try {
      console.log(message.dynamodb?.NewImage);
      console.log(message.dynamodb?.Keys);
      console.log(message.eventName);
      const event = message.eventName;
      if (event === "INSERT") {
        await createStackAsync(message);
      } else if (event === "REMOVE") {
        await deleteStackAsync(message);
      }
    } catch (error) {
      console.log(error);
    }
  }
  return "processed task(s)";
};

async function createStackAsync(message: DynamoDBRecord) {
  try {
    if (!message.dynamodb?.NewImage)
      throw new Error("No Data exists on record");
    console.log(message.dynamodb?.NewImage);
    const id: string = message.dynamodb?.NewImage["id"].S as string;
    const userId: string = message.dynamodb?.NewImage["userId"].S as string;
    const githubUrl: string = message.dynamodb?.NewImage["githubUrl"]
      .S as string;
    const versionSlug: string = message.dynamodb?.NewImage["versionSlug"]
      .S as string;
    const githubToken: string = message.dynamodb?.NewImage["githubToken"]
      .S as string;
    const rpcUrl: string = message.dynamodb?.NewImage["rpcUrl"].S as string;
    const chainId: string = message.dynamodb?.NewImage["chainId"].S as string;

    const body = {
      userId,
      githubUrl,
      versionSlug,
      githubToken,
      rpcUrl,
      chainId,
    };
    const stackName = id;
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
        {
          ParameterKey: "githubToken",
          ParameterValue: body.githubToken,
          UsePreviousValue: false,
        },
        {
          ParameterKey: "rpcUrl",
          ParameterValue: body.rpcUrl,
          UsePreviousValue: false,
        },
        {
          ParameterKey: "chainId",
          ParameterValue: body.chainId,
          UsePreviousValue: false,
        },
      ],
      Capabilities: [
        "CAPABILITY_AUTO_EXPAND",
        "CAPABILITY_AUTO_EXPAND",
        "CAPABILITY_NAMED_IAM",
      ],
      RoleARN: process.env.CFM_ROLE_ARN,
      // ResourceTypes: ["AWS::*"],
      OnFailure: "ROLLBACK",
      EnableTerminationProtection: false,
    };
    const command = new CreateStackCommand(input);
    const response = await client.send(command);
    console.log("Creating Stack with ID :", response?.StackId);
  } catch (err) {
    console.error("An error occurred");
    throw err;
  }
}

//TODO-fix
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
