import express from "express";
import { getStockStatements } from "../controllers/stock.controller.js";
import { auth } from "../utils/verify.js";

const stockRouter = express.Router();

stockRouter.get("/", auth, getStockStatements);

export default stockRouter;
