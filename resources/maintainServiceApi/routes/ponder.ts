import express from "express";
import {
  createPonderService,
  deletePonderService,
  getPonderService,
  //@ts-ignore
} from "../database.ts";
//@ts-ignore
import { hasGitAppInstalled, isLoggedIn } from "../middleware/index.ts";
import { getAllInstalledUserRepositories } from "../github/index.js";

const router = express.Router();

router.get("/getPonderServiceStatus", isLoggedIn, (req, res) => {
  console.log("in get ponder status");
  res.status(200).send("in get ponder status");
});

router.post(
  "/createPonderService",
  isLoggedIn,
  hasGitAppInstalled,
  async (req, res) => {
    const allInstalledRepositories = await getAllInstalledUserRepositories(
      //@ts-ignore
      req.user.userName,
      //@ts-ignore
      req.user.accessToken
    );
    let requestJSON = req.body;
    if (!allInstalledRepositories.includes(requestJSON.githubUrl))
      throw new Error("Repo not installed");
    await createPonderService(requestJSON);
    res.status(200).send();
  }
);

router.post(
  "/deletePonderService",
  isLoggedIn,
  hasGitAppInstalled,
  async (req, res) => {
    let requestJSON = req.body;
    const ponderServiceData = await getPonderService(requestJSON.id);
    const allInstalledRepositories = await getAllInstalledUserRepositories(
      //@ts-ignore
      req.user.userName,
      //@ts-ignore
      req.user.accessToken
    );
    //@ts-ignore
    if (!allInstalledRepositories.includes(ponderServiceData.githubUrl))
      throw new Error("User does have access to the repo");
    deletePonderService(requestJSON.id);
    res.status(200).send();
  }
);

export const ponderRouter = router;
