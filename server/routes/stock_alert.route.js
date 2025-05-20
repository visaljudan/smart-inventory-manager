import express from "express";
import {
  createStockAlert,
  dismissStockAlert,
  getStockAlerts,
} from "../controllers/stock_alert.controller.js";
import { auth } from "../utils/verify.js";

const stockAlertRouter = express.Router();

stockAlertRouter.post("/", auth, createStockAlert);
stockAlertRouter.get("/", auth, getStockAlerts);
stockAlertRouter.patch("/:id/dismiss", auth, dismissStockAlert);

export default stockAlertRouter;
