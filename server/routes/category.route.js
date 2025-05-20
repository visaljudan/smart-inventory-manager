import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
} from "../controllers/category.controller.js";

const categoryRouter = express.Router();

// Compeleted
categoryRouter.post("/", createCategory);
categoryRouter.get("/", getCategories);
categoryRouter.get("/:id", getCategory);
categoryRouter.patch("/:id", updateCategory);
categoryRouter.delete("/:id", deleteCategory);

export default categoryRouter;
