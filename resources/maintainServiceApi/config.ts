import dotenv from "dotenv";
dotenv.config();

export const config = {
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  githubPrivateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  isLocal: process.env.IS_LOCAL!,
  callbackUrl: process.env.CALLBACK_URL!,
  sessionSecret: process.env.SESSION_SECRET!,
  appID: process.env.GITHUB_APP_ID!,
};

console.log(config);
