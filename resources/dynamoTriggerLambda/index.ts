import { DynamoDBRecord, DynamoDBStreamEvent, Handler } from "aws-lambda";
import {
  CloudFormationClient,
  CreateStackCommand,
  CreateStackCommandInput,
  DeleteStackCommand,
  DeleteStackCommandInput,
} from "@aws-sdk/client-cloudformation";
import PonderStack from "./in/PonderStack.template.json";
import { deserializeData } from "./utils";

const client = new CloudFormationClient({});

export const handler: Handler = async (event: DynamoDBStreamEvent) => {
  for (const message of event.Records) {
    try {
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
    const body = deserializeData(message.dynamodb?.NewImage, [
      "id",
      "userId",
      "githubUrl",
      "versionSlug",
      "githubToken",
      "rpcUrl",
      "chainId",
      "stackIndex",
    ]);
    const split = body.githubUrl.split("/");
    const repoOwnerName = split[0];
    const repoName = split[1];
    let templateBody = JSON.stringify(PonderStack);
    // templateBody = templateBody.replace("PonderStack", body.id);
    // templateBody = templateBody.replace("ponderstack", body.id.toLowerCase());
    const stackName = body.id;
    const input: CreateStackCommandInput = {
      StackName: stackName,
      TemplateBody: templateBody,
      Parameters: [
        {
          ParameterKey: "version",
          ParameterValue: body.versionSlug,
          UsePreviousValue: true,
        },
        // {
        //   ParameterKey: "githubUrl",
        //   ParameterValue: body.githubUrl,
        //   UsePreviousValue: true,
        // },
        {
          ParameterKey: "repoOwnerName",
          ParameterValue: repoOwnerName,
          UsePreviousValue: true,
        },
        {
          ParameterKey: "repoName",
          ParameterValue: repoName,
          UsePreviousValue: true,
        },
        {
          ParameterKey: "userId",
          ParameterValue: body.userId,
          UsePreviousValue: true,
        },
        {
          ParameterKey: "githubToken",
          ParameterValue: body.githubToken,
          UsePreviousValue: true,
        },
        {
          ParameterKey: "rpcUrl",
          ParameterValue: body.rpcUrl,
          UsePreviousValue: true,
        },
        {
          ParameterKey: "chainId",
          ParameterValue: body.chainId,
          UsePreviousValue: true,
        },
        // {
        //   ParameterKey: "githubName",
        //   ParameterValue: body.githubToken,
        //   UsePreviousValue: true,
        // },
        {
          ParameterKey: "stackIndex",
          ParameterValue: body.stackIndex,
          UsePreviousValue: true,
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
    const body = deserializeData(message.dynamodb.Keys, [
      "userId",
      "githubUrl",
      "versionSlug",
    ]);
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
