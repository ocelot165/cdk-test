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
require("https").globalAgent.options.rejectUnauthorized = false;

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
  console.log(req.cookies, "cookiesss");
  if (req && req.cookies) {
    token = req.cookies["authJWT"];
  }
  return token;
};

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
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
passport.use(gitStrategy);

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj: User, done) {
  done(null, obj);
});

app.use("/auth", authRouter);
app.use("/ponder", ponderRouter);
app.use("/user", userRouter);

app.use((_: express.Request, res: express.Response) => {
  res.status(404).send();
});

app.use((err: any, _: express.Request, res: express.Response) => {
  return res.status(err.status || 500).send();
});

let prodHandlerFn;
app.listen(3000, function () {
  console.log("Express server listening on port " + 3000);
});
//@ts-ignore
if (process.env.IS_LOCAL === "false") {
  const handler = serverless(app);
  //@ts-ignore
  prodHandlerFn = async (event, context, callback) => {
    //@ts-ignore
    const response = await handler(event, context, callback);
    return response;
  };
}

export const handler = prodHandlerFn;
