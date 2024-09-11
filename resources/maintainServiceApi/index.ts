import { CreateTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import "express-async-errors";
import express from "express";
import serverless from "serverless-http";
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { uuid } from "uuidv4";
import passport from "passport";
import { User } from "./types";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
//@ts-ignore
import { authRouter } from "./routes/auth.ts";
//@ts-ignore
import { ponderRouter } from "./routes/ponder.ts";
import dotenv from "dotenv";
//@ts-ignore
import { config } from "./config.ts";
import { readFileSync } from "fs";
//@ts-ignore
import { gitStrategy } from "./github/index.ts";
//@ts-ignore
import { userRouter } from "./routes/user.ts";
import { getUser } from "./database";
import cookieParser from "cookie-parser";
dotenv.config();

passport.serializeUser(function (user, done) {
  console.log("in serialize user", user);
  done(null, user);
});

passport.deserializeUser(function (obj: User, done) {
  done(null, obj);
});

const cookieExtractor = function (req: any) {
  var token = null;
  if (req && req.cookies) {
    token = req.cookies["authJWT"];
  }
  return token;
};

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(client);

const tableName = "serviceTable";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
passport.use(gitStrategy);
passport.use(
  new JwtStrategy(
    {
      secretOrKey: config.githubPrivateKey,
      jwtFromRequest: cookieExtractor,
      algorithms: ["RS256"],
    },
    async function (jwtPayload, done) {
      if (jwtPayload.expiration < Date.now()) {
        return done("Unauthorized", false);
      }
      return done(null, jwtPayload);
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj: User, done) {
  done(null, obj);
});

app.use("/auth", authRouter);
app.use("/ponder", ponderRouter);
app.use("/user", userRouter);

app.get("/getPonderServiceStatus", (req, res) => {
  console.log("in get ponder status");
  res.status(200).send("in get ponder status");
});

app.post("/createPonderService", async (req, res) => {
  console.log("in create ponder service");
  let requestJSON = req.body;
  const id = `e${uuid()}`;
  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        partitionKey: id,
        id: id,
        userId: requestJSON.userId,
        githubUrl: requestJSON.githubUrl,
        versionSlug: requestJSON.versionSlug,
        githubToken: requestJSON.githubToken,
        chainId: requestJSON.chainId,
        rpcUrl: requestJSON.rpcUrl,
      },
    })
  );
  res.status(200).send();
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
  res.status(200).send();
});

app.use((_: express.Request, res: express.Response) => {
  res.status(404).send();
});

app.use((err: any, _: express.Request, res: express.Response) => {
  return res.status(err.status || 500).send();
});

let prodHandlerFn;
//@ts-ignore
if (process.env.IS_LOCAL === false) {
  prodHandlerFn = serverless(app);
} else {
  app.listen(3000, function () {
    console.log("Express server listening on port " + 3000);
  });
}

export const handler = prodHandlerFn;
