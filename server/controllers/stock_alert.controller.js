import mongoose from "mongoose";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitStockAlertEvent } from "../utils/socketioFunctions.js";
import Product from "../models/product.model.js";
import StockAlert from "../models/stock_alert.model.js";

export const createStockAlert = async (req, res, next) => {
  try {
    const { productId, currentQuantity, reorderLevel } = req.body;
    const userId = req.user?._id;

    // Product
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 400, "Invalid product ID format.");
    }
    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 400, "Product not found.");
    }

    // Check for existing alert
    const existingAlert = await StockAlert.findOne({
      productId,
      userId,
      status: "active",
    });

    if (existingAlert) {
      return sendError(
        res,
        409,
        "Stock alert already exists for this product."
      );
    }

    const alert = await StockAlert.create({
      productId,
      userId,
      currentQuantity,
      reorderLevel,
    });

    const populatedStockAlert = await StockAlert.findById(alert._id)
      .populate("userId", "name email")
      .populate("productId", "name sku");

    emitStockAlertEvent("stockAlertCreated", populatedStockAlert);

    return sendSuccess(res, 201, "Stock alert created.", populatedStockAlert);
  } catch (err) {
    next(err);
  }
};

export const getStockAlerts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = { userId: req.user._id };

    const total = await StockAlert.countDocuments(query);

    const alerts = await StockAlert.find(query)
      .populate("userId", "name email")
      .populate("productId", "name sku")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return sendSuccess(res, 200, "Stock alerts retrieved.", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: alerts,
    });
  } catch (err) {
    next(err);
  }
};

export const dismissStockAlert = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid alert ID format.");
    }

    const alert = await StockAlert.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { status: "dismissed" },
      { new: true }
    );

    if (!alert) {
      return sendError(res, 404, "Alert not found or already dismissed.");
    }

    const populatedStockAlert = await StockAlert.findById(alert._id)
      .populate("userId", "name email")
      .populate("productId", "name sku");

    emitStockAlertEvent("stockAlertUpdated", populatedStockAlert);

    return sendSuccess(res, 200, "Stock alert dismissed.", populatedStockAlert);
  } catch (err) {
    next(err);
  }
};

export const readStockAlert = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid alert ID format.");
    }

    const alert = await StockAlert.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    console.log(id);

    if (!alert) {
      return sendError(res, 404, "Alert not found or already read.");
    }

    const populatedStockAlert = await StockAlert.findById(alert._id)
      .populate("userId", "name email")
      .populate("productId", "name sku");

    emitStockAlertEvent("stockAlertRead", populatedStockAlert);

    return sendSuccess(
      res,
      200,
      "Stock alert marked as read.",
      populatedStockAlert
    );
  } catch (err) {
    next(err);
  }
};
