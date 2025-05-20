import express from "express";
import {
  getProduct,
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  addProductQuantity,
} from "../controllers/product.controller.js";
import { auth } from "../utils/verify.js";

const productRouter = express.Router();

productRouter.post("/", auth, createProduct);
productRouter.get("/", auth, getProducts);
productRouter.get("/:id", auth, getProduct);
productRouter.patch("/:id", auth, updateProduct);
productRouter.delete("/:id", auth, deleteProduct);
productRouter.patch("/:id/add-quantity", auth, addProductQuantity);

export default productRouter;
