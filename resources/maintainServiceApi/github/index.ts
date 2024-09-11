//@ts-ignore
import { config } from "../config.ts";
import jwt from "jsonwebtoken";
import GithubStrategy from "passport-github2";
//@ts-ignore
import { createUser, getUser } from "../database.ts";
import fetch from "node-fetch";

export const gitStrategy = new GithubStrategy.Strategy(
  {
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: config.callbackUrl,
  },
  async function (
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any
  ) {
    let user = await createUser(
      profile.id,
      profile.username,
      accessToken,
      refreshToken
    );
    done(null, user);
  }
);

const getJwt = () =>
  jwt.sign(
    {
      iat: Number((Date.now() / 1000).toFixed(0)),
      exp: Number((Date.now() / 1000).toFixed(0)) + 600,
      iss: config.clientId,
    },
    config.githubPrivateKey,
    { algorithm: "RS256" }
  );

export async function getUserInstallationID(username: string): Promise<string> {
  const jwtToken = getJwt();
  const apiResult = await fetch(
    `https://api.github.com/users/${username}/installation`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwtToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  const status = apiResult.status;
  if (status !== 200) throw new Error("Could not fetch installation id");
  const result: any = await apiResult.json();
  return result.id;
}

export async function checkIfAppInstalled(userName: string) {
  try {
    await getUserInstallationID(userName);
    return true;
  } catch (error) {
    console.log(error, "error");
    return false;
  }
}

export async function getAllInstalledUserRepositories(
  username: string,
  accessToken: string
): Promise<string[]> {
  let allRepos: string[] = [];
  let pageIndex = 1;

  const installationId = await getUserInstallationID(username);

  let res = [""];
  while (res.length > 0) {
    const apiResult = await fetch(
      `https://api.github.com/user/installations/${installationId}/repositories?type=all&per_page=100&page=${pageIndex++}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    const status = apiResult.status;
    if (status !== 200) throw new Error("Could not fetch user repos");
    const data: any = await apiResult.json();
    res = data.repositories
      .filter((val: any) => val.permissions.pull)
      .map((val: any) => val.full_name);
    allRepos = [...allRepos, ...res];
  }

  return allRepos;
}
