import mongoose from "mongoose";
import Customer from "../models/customer.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitCustomerEvent } from "../utils/socketioFunctions.js";

// @desc Create a new customer
export const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, note } = req.body;
    const userId = req.user._id;

    if (!name) {
      return sendError(res, 400, "Name is required to create a customer.");
    }

    const customer = new Customer({
      userId,
      name,
      phone,
      email,
      address,
      note,
    });

    await customer.save();

    const populatedCustomer = await Customer.findById(customer._id).populate(
      "userId",
      "name email"
    );

    emitCustomerEvent("customerCreated", populatedCustomer);

    return sendSuccess(
      res,
      201,
      "Customer created successfully.",
      populatedCustomer
    );
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
    } = req.query;

    const skip = (page - 1) * limit;
    const query = { userId: req.user._id };

    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, "i") } },
        { email: { $regex: new RegExp(search, "i") } },
        { phone: { $regex: new RegExp(search, "i") } },
        { address: { $regex: new RegExp(search, "i") } },
        { note: { $regex: new RegExp(search, "i") } },
      ];
    }

    const customers = await Customer.find(query)
      .populate("userId", "name email")
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Customer.countDocuments(query);

    return sendSuccess(res, 200, "Customers fetched successfully.", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Customer ID format.");
    }

    const customer = await Customer.findOne({ _id: id, userId: userId });
    if (!customer) {
      return sendError(res, 404, "Customer not found.");
    }

    const populatedCustomer = await Customer.findById(id).populate(
      "userId",
      "name email"
    );

    return sendSuccess(
      res,
      200,
      "Customer fetched successfully.",
      populatedCustomer
    );
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, note } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Customer ID format.");
    }

    const customer = await Customer.findOne({ _id: id, userId: userId });
    if (!customer) {
      return sendError(res, 404, "Customer not found.");
    }

    if (name !== undefined) customer.name = name;
    if (phone !== undefined) customer.phone = phone;
    if (email !== undefined) customer.email = email;
    if (address !== undefined) customer.address = address;
    if (note !== undefined) customer.note = note;

    await customer.save();

    const updatedCustomer = await Customer.findById(id).populate(
      "userId",
      "name email"
    );

    emitCustomerEvent("customerUpdated", updatedCustomer);

    return sendSuccess(
      res,
      200,
      "Customer updated successfully.",
      updatedCustomer
    );
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Customer ID format.");
    }

    const customer = await Customer.findOneAndDelete({
      _id: id,
      userId: userId,
    });

    if (!customer) {
      return sendError(res, 404, "Customer not found.");
    }

    emitCustomerEvent("customerDeleted", id);

    return sendSuccess(res, 200, "Customer deleted successfully.");
  } catch (error) {
    next(error);
  }
};
