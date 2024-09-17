import * as dotenv from "dotenv";
import path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export type ConfigProps = {
  GITHUB_URL?: string;
  USER_ID?: string;
  GITHUB_TOKEN?: string;
  CHAIN_ID?: string;
  RPC_URL?: string;
  PONDER_STACK_CONTEXT?: string;
  GITHUB_NAME?: string;
  STACK_INDEX?: string;
};

export const getConfig = (): ConfigProps => ({
  GITHUB_URL: process.env.GITHUB_URL,
  USER_ID: process.env.USER_ID,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  CHAIN_ID: process.env.CHAIN_ID,
  RPC_URL: process.env.RPC_URL,
  PONDER_STACK_CONTEXT: process.env.PONDER_STACK_CONTEXT,
  GITHUB_NAME: process.env.GITHUB_USERNAME,
  STACK_INDEX: process.env.STACK_INDEX,
});

dotenv.config({
  path: path.resolve(__dirname, "../resources/maintainServiceApi/.env"),
});

export const getLambdaConfig = () => ({
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID!,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET!,
  GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  IS_LOCAL: process.env.IS_LOCAL!,
  CALLBACK_URL: process.env.CALLBACK_URL!,
  SESSION_SECRET: process.env.SESSION_SECRET!,
  GITHUB_APP_ID: process.env.GITHUB_APP_ID!,
});
