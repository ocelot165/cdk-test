import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import express from "express";
import serverless from "serverless-http";
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(client);

const tableName = "serviceTable";

const app = express();
app.use(express.json());

app.get("/getPonderServiceStatus", (req, res) => {
  console.log("in get ponder status");
});

app.post("/createPonderService", async (req, res) => {
  console.log("in create ponder service");
  let requestJSON = req.body;
  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        id: requestJSON.id,
        userId: requestJSON.userId,
        githubUrl: requestJSON.githubUrl,
        versionSlug: requestJSON.versionSlug,
      },
    })
  );
});

app.post("/deletePonderService", async (req, res) => {
  console.log("in delete ponder service");
  let requestJSON = req.body;
  await dynamo.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { id: requestJSON.id },
    })
  );
});

app.use((_: express.Request, res: express.Response) => {
  res.status(404).send();
});

app.use((err: any, _: express.Request, res: express.Response) => {
  res.status(err.status || 500).send();
});

//@ts-ignore
export const handler = serverless(app);
