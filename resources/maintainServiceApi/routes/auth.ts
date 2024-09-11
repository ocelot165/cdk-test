import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
//@ts-ignore
import { config } from "../config.ts";

const router = express.Router();

router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
  })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/auth/failed",
    failureFlash: true,
    scope: [],
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign(
      JSON.stringify({
        ...req.user,
        expiration: Date.now() + 7 * 60 * 60 * 1000,
      }),
      config.githubPrivateKey,
      { algorithm: "RS256" }
    );
    res
      .cookie("authJWT", token, {
        httpOnly: !config.isLocal,
        secure: !config.isLocal,
      })
      .status(200)
      .send("Success");
  }
);

export const authRouter = router;
