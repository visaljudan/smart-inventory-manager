import mongoose from "mongoose";
import Product from "../models/product.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitProductEvent, emitUserEvent } from "../utils/socketioFunctions.js";
import Category from "../models/category.model.js";
import StockAlert from "../models/stock_alert.model.js";
import Stock from "../models/stock.model.js";

export const createProduct = async (req, res, next) => {
  try {
    const { name, sku, categoryId, quantity, reorderLevel, price, cost } =
      req.body;

    if (
      !name ||
      !sku ||
      quantity == null ||
      reorderLevel == null ||
      price == null ||
      cost == null
    ) {
      return sendError(res, 400, "All fields are required.");
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return sendError(res, 400, "Invalid Category ID format.");
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return sendError(res, 400, "Category not found.");
    }

    const existingSku = await Product.findOne({ sku });
    if (existingSku) return sendError(res, 409, "SKU already exists.");

    const product = new Product({
      userId: req.user._id,
      name,
      sku,
      categoryId,
      quantity,
      reorderLevel,
      price,
      cost,
    });

    await product.save();

    if (product.quantity <= product.reorderLevel) {
      await StockAlert.create({
        productId: product._id,
        userId: product.userId,
        currentQuantity: product.quantity,
        reorderLevel: product.reorderLevel,
        status: "active",
      });
    }

    const populatedProduct = await Product.findById(product._id)
      .populate("userId", "name email")
      .populate("categoryId", "name slug status");

    emitProductEvent("productCreated", populatedProduct);

    return sendSuccess(
      res,
      201,
      "Product created successfully",
      populatedProduct
    );
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
      categoryId,
    } = req.query;

    const skip = (page - 1) * limit;
    const query = { userId: req.user._id };

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, "i") } },
        { sku: { $regex: new RegExp(search, "i") } },
        { categoryId: { $regex: new RegExp(search, "i") } },
      ];
    }

    // Filter by categoryId (optional)
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return sendError(res, 400, "Invalid Category ID format.");
      }

      const category = await Category.findById(categoryId);
      if (!category) {
        return sendError(res, 400, "Category not found.");
      }
      query.categoryId = categoryId;
    }

    const products = await Product.find(query)
      .populate("userId", "name email")
      .populate("categoryId", "name slug status")
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    return sendSuccess(res, 200, "Products fetched successfully.", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid product ID format.");
    }

    const product = await Product.findOne({ _id: id, userId: req.user._id });
    if (!product) return sendError(res, 404, "Product not found");

    const populatedProduct = await Product.findById(product._id)
      .populate("userId", "name email")
      .populate("categoryId", "name slug status");

    return sendSuccess(
      res,
      200,
      "Product fetched successfully",
      populatedProduct
    );
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sku, categoryId, quantity, reorderLevel, price, cost } =
      req.body;

    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid product ID format.");
    }

    const product = await Product.findOne({ _id: id, userId });
    if (!product) return sendError(res, 404, "Product not found");

    if (sku && sku !== product.sku) {
      const existingSku = await Product.findOne({ sku });
      if (existingSku) return sendError(res, 409, "SKU already exists.");
      product.sku = sku;
    }

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return sendError(res, 400, "Invalid Category ID format.");
      }

      const category = await Category.findById(categoryId);
      if (!category) {
        return sendError(res, 400, "Category not found.");
      }
    }

    product.name = name || product.name;
    product.categoryId = categoryId || product.categoryId;
    product.quantity = quantity ?? product.quantity;
    product.reorderLevel = reorderLevel ?? product.reorderLevel;
    product.price = price ?? product.price;
    product.cost = cost ?? product.cost;

    await product.save();

    // Stock alert logic
    if (product.quantity <= product.reorderLevel) {
      const existingAlert = await StockAlert.findOne({
        productId: product._id,
        userId,
        status: "active",
      });

      if (!existingAlert) {
        await StockAlert.create({
          productId: product._id,
          userId,
          currentQuantity: product.quantity,
          reorderLevel: product.reorderLevel,
          status: "active",
        });
      }
    } else {
      // Dismiss any active alerts
      await StockAlert.updateMany(
        { productId: product._id, userId, status: "active" },
        { status: "dismissed" }
      );
    }

    const populatedProduct = await Product.findById(product._id)
      .populate("userId", "name email")
      .populate("categoryId", "name slug status");

    emitProductEvent("productUpdated", populatedProduct);

    return sendSuccess(
      res,
      200,
      "Product updated successfully",
      populatedProduct
    );
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid product ID format.");
    }

    const product = await Product.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });
    if (!product) return sendError(res, 404, "Product not found");

    emitProductEvent("productDeleted", id);

    return sendSuccess(res, 200, "Product deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const addProductQuantity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { addedQuantity } = req.body;
    const userId = req.user._id;

    console.log(typeof addedQuantity);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid product ID format.");
    }

    const product = await Product.findOne({ _id: id, userId });
    if (!product) return sendError(res, 404, "Product not found");

    if (typeof addedQuantity !== "number" || addedQuantity <= 0) {
      return sendError(res, 400, "addedQuantity must be a positive number.");
    }

    product.quantity += addedQuantity;
    await product.save();
    // ✅ Record the stock entry
    await Stock.create({
      userId: userId,
      productId: product._id,
      quantity: addedQuantity,
      type: "stock in",
      note: "Product is stock in.",
    });

    // Dismiss stock alerts if necessary
    if (product.quantity > product.reorderLevel) {
      const result = await StockAlert.updateMany(
        { productId: product._id, userId, status: "active" },
        { status: "dismissed" }
      );
      console.log("StockAlert update result:", result);
    }

    const populatedProduct = await Product.findById(product._id)
      .populate("userId", "name email")
      .populate("categoryId", "name slug status");

    emitProductEvent("productRestocked", populatedProduct);

    return sendSuccess(
      res,
      200,
      "Product quantity updated successfully.",
      populatedProduct
    );
  } catch (error) {
    next(error);
  }
};
