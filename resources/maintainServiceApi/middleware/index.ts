//@ts-ignore
import { checkIfAppInstalled } from "../github/index.ts";

//@ts-ignore
export const isLoggedIn = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.status(401).send("Not Logged In");
  }
};

//@ts-ignore
export const hasGitAppInstalled = (req, res, next) => {
  checkIfAppInstalled(req.user.userName).then((val) => {
    if (val) {
      next();
    } else {
      res.status(401).send("App not installed");
    }
  });
};
