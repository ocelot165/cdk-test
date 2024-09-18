import "express-async-errors";
import express from "express";
import serverless from "serverless-http";
import passport from "passport";
import { User } from "./types";
import { Strategy as JwtStrategy } from "passport-jwt";
//@ts-ignore
import { authRouter } from "./routes/auth.ts";
//@ts-ignore
import { ponderRouter } from "./routes/ponder.ts";
import dotenv from "dotenv";
//@ts-ignore
import { config } from "./config.ts";
//@ts-ignore
import { gitStrategy } from "./github/index.ts";
//@ts-ignore
import { userRouter } from "./routes/user.ts";
import cookieParser from "cookie-parser";
require("https").globalAgent.options.rejectUnauthorized = false;

dotenv.config();

passport.serializeUser(function (user, done) {
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
app.listen(3000, function () {});
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
