import express from "express";
import {
  createSale,
  getSales,
  getSale,
} from "../controllers/sale.controller.js";
import { auth } from "../utils/verify.js";

const saleRouter = express.Router();

saleRouter.post("/", auth, createSale);
saleRouter.get("/", auth, getSales);
saleRouter.get("/:id", auth, getSale);

export default saleRouter;
