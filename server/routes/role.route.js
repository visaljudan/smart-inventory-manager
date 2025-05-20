import express from "express";
import {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
} from "../controllers/role.controller.js";

const roleRouter = express.Router();

// Compeleted
roleRouter.post("/", createRole);
roleRouter.get("/", getRoles);
roleRouter.get("/:id", getRole);
roleRouter.put("/:id", updateRole);
roleRouter.delete("/:id", deleteRole);

export default roleRouter;
