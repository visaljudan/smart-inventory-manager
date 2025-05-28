import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
} from "../controllers/category.controller.js";
import { auth } from "../utils/verify.js";

const categoryRouter = express.Router();

// Compeleted
categoryRouter.post("/", auth, createCategory);
categoryRouter.get("/", auth, getCategories);
categoryRouter.get("/:id", auth, getCategory);
categoryRouter.patch("/:id", auth, updateCategory);
categoryRouter.delete("/:id", auth, deleteCategory);

export default categoryRouter;
