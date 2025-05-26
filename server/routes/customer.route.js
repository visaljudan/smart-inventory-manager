import express from "express";
import {
  getCustomer,
  createCustomer,
  updateCustomer,
  getCustomers,
  deleteCustomer,
} from "../controllers/customer.controller.js";

const customerRouter = express.Router();

// Compeleted
customerRouter.post("/", createCustomer);
customerRouter.get("/", getCustomers);
customerRouter.get("/:id", getCustomer);
customerRouter.put("/:id", updateCustomer);
customerRouter.delete("/:id", deleteCustomer);

export default customerRouter;
