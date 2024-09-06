import * as dotenv from "dotenv";
import path = require("path");

// 1. Configure dotenv to read from our `.env` file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// 2. Define a TS Type to type the returned envs from our function below.
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

// 3. Define a function to retrieve our env variables
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
