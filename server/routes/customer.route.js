import express from "express";
import {
  getCustomer,
  createCustomer,
  updateCustomer,
  getCustomers,
  deleteCustomer,
} from "../controllers/customer.controller.js";
import { auth } from "../utils/verify.js";

const customerRouter = express.Router();

// Compeleted
customerRouter.post("/", auth, createCustomer);
customerRouter.get("/", auth, getCustomers);
customerRouter.get("/:id", auth, getCustomer);
customerRouter.put("/:id", auth, updateCustomer);
customerRouter.delete("/:id", auth, deleteCustomer);

export default customerRouter;
