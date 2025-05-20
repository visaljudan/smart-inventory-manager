import express from "express";
import {
  deleteUser,
  getUser,
  getUsers,
  updateOwnUser,
  updateUser,
} from "../controllers/user.controller.js";
import { auth } from "../utils/verify.js";

const userRouter = express.Router();

userRouter.get("/", getUsers);
userRouter.get("/:id", getUser);
userRouter.patch("/:id", updateUser);
userRouter.delete("/:id", deleteUser);
userRouter.patch("/me", auth, updateOwnUser);

export default userRouter;
