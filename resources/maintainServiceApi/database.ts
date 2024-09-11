import {
  AttributeValue,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { DeleteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { uuid } from "uuidv4";
//@ts-ignore
import { config } from "./config.ts";

const client = new DynamoDBClient(
  config.isLocal
    ? {
        endpoint: "http://localhost:8000",
      }
    : {}
);

type DynamodbData = Record<string, AttributeValue>;

function getDefinedData(attributeValue: AttributeValue) {
  if (attributeValue.S) return attributeValue.S;
  else if (attributeValue.N) return Number(attributeValue.N);
  return;
}

function serializeData(item: DynamodbData) {
  const keys = Object.keys(item);
  return keys.reduce(
    (prev, curr) => ({ ...prev, [curr]: getDefinedData(item[curr]) }),
    {}
  );
}

export async function getUser(id: string) {
  const command = new GetItemCommand({
    Key: {
      id: {
        N: id,
      },
    },
    TableName: "serviceTable",
  });
  const response = await client.send(command);
  if (!response.Item) return undefined;
  return serializeData(response.Item);
}

export async function createUser(
  id: string,
  userName: string,
  accessToken: string,
  refreshToken: string
) {
  const command = new PutItemCommand({
    Item: {
      id: {
        N: id,
      },
      userName: {
        S: userName,
      },
      accessToken: {
        S: accessToken,
      },
      refreshToken: {
        S: refreshToken,
      },
    },
    TableName: "serviceTable",
  });
  await client.send(command);
  return {
    id,
    userName,
    accessToken,
    refreshToken,
  };
}

export async function createPonderService(body: any) {
  const id = `e${uuid()}`;
  await client.send(
    new PutCommand({
      TableName: "serviceTable",
      Item: {
        partitionKey: id,
        id: id,
        userId: body.userId,
        githubUrl: body.githubUrl,
        versionSlug: body.versionSlug,
        githubToken: body.githubToken,
        chainId: body.chainId,
        rpcUrl: body.rpcUrl,
      },
    })
  );
}

export async function deletePonderService(id: string) {
  await client.send(
    new DeleteCommand({
      TableName: "serviceTable",
      Key: { id: id },
    })
  );
}

export async function getPonderService(id: string) {
  const response = await client.send(
    new GetCommand({
      TableName: "serviceTable",
      Key: { id: id },
    })
  );
  if (!response.Item) return undefined;

  return serializeData(response.Item);
}
