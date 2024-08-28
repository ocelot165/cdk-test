import express from "express";
import serverless from "serverless-http";

const app = express();
app.use(express.json());

app.get("/getPonderServiceStatus", (req, res) => {
  console.log("in get ponder status");
});

app.post("/createPonderService", (req, res) => {
  console.log("in create ponder service");
});

app.post("/deletePonderService", (req, res) => {
  console.log("in delete ponder service");
});

app.use((_: express.Request, res: express.Response) => {
  res.status(404).send();
});

app.use((err: any, _: express.Request, res: express.Response) => {
  res.status(err.status || 500).send();
});

//@ts-ignore
export const handler = serverless(app);
