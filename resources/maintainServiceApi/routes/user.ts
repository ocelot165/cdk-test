import express from "express";
//@ts-ignore
import { isLoggedIn } from "../middleware/index.ts";
import passport from "passport";
import {
  checkIfAppInstalled,
  getAllInstalledUserRepositories,
  //@ts-ignore
} from "../github/index.ts";

const router = express.Router();

router.use(passport.authenticate("jwt", { session: false }));

router.get("/", isLoggedIn, function (req, res) {
  return res.status(200).send(JSON.stringify({ user: req.user }));
});

router.get("/isInstalled", isLoggedIn, async function (req, res) {
  //@ts-ignore
  const isInstalled = await checkIfAppInstalled(req.user?.userName as string);
  return res.status(200).send({
    isInstalled,
  });
});

router.get("/repos", isLoggedIn, async function (req, res) {
  const allInstalledRepositories = await getAllInstalledUserRepositories(
    //@ts-ignore
    req.user.userName,
    //@ts-ignore
    req.user.accessToken
  );
  return res.status(200).send({
    repos: allInstalledRepositories,
  });
});

export const userRouter = router;
