import express from "express";
import {
  createStockAlert,
  dismissStockAlert,
  getStockAlerts,
  readStockAlert,
} from "../controllers/stock_alert.controller.js";
import { auth } from "../utils/verify.js";

const stockAlertRouter = express.Router();

stockAlertRouter.post("/", auth, createStockAlert);
stockAlertRouter.get("/", auth, getStockAlerts);
stockAlertRouter.patch("/:id/dismiss", auth, dismissStockAlert);
stockAlertRouter.patch("/:id/read", auth, readStockAlert);

export default stockAlertRouter;
