import mongoose from "mongoose";
import Sale from "../models/sale.model.js";
import Product from "../models/product.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitProductEvent, emitSaleEvent } from "../utils/socketioFunctions.js";
import StockAlert from "../models/stock_alert.model.js";
import Customer from "../models/customer.model.js";
import Stock from "../models/stock.model.js";

export const createSale = async (req, res, next) => {
  try {
    const {
      customerId,
      name,
      phone,
      email,
      address,
      note,
      products,
      saleDate,
    } = req.body;
    const userId = req.user._id;

    if (!userId) {
      return sendError(res, 401, "User not authenticated.");
    }

    if (!Array.isArray(products) || products.length === 0) {
      return sendError(
        res,
        400,
        "Products array is required and must not be empty."
      );
    }

    let customer = null;
    let customerName = name;
    let customerPhone = phone;
    let customerEmail = email;
    let customerAddress = address;
    let customerNote = note;

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return sendError(res, 400, "Invalid customer ID format.");
      }

      customer = await Customer.findById(customerId);
      if (!customer) {
        return sendError(res, 400, "Customer not found.");
      }

      customerName = customer.name;
      customerPhone = customer.phone;
      customerEmail = customer.email;
      customerAddress = customer.address;
      customerNote = customer.note;
    }

    let totalAmount = 0;
    const saleProducts = [];

    for (const item of products) {
      const { productId, quantity } = item;

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return sendError(res, 400, "Invalid or missing product ID.");
      }

      if (typeof quantity !== "number" || quantity <= 0) {
        return sendError(res, 400, "Quantity must be a positive number.");
      }

      const product = await Product.findById(productId);
      if (!product) {
        return sendError(res, 400, "Product not found.");
      }

      if (product.quantity < quantity) {
        return sendError(
          res,
          400,
          `Insufficient stock for product ${product.name}.`
        );
      }

      const unitPrice = product.price;
      const total = quantity * unitPrice;
      totalAmount += total;

      product.quantity -= quantity;
      await product.save();

      // ✅ Create stock out record for each product sold
      await Stock.create({
        userId: userId,
        productId: product._id,
        quantity: quantity,
        type: "stock out",
        note: `Sold ${quantity} unit(s) of ${product.name}.`,
      });

      // 🔔 Check and create low-stock alert if needed
      if (product.quantity <= product.reorderLevel) {
        const existingAlert = await StockAlert.findOne({
          productId: product._id,
          userId: userId,
          status: "active",
        });

        if (!existingAlert) {
          await StockAlert.create({
            productId: product._id,
            userId: userId,
            currentQuantity: product.quantity,
            reorderLevel: product.reorderLevel,
            status: "active",
          });
          emitProductEvent("productUpdated", product);
        }
      }

      saleProducts.push({
        productId,
        quantity,
        unitPrice,
        total,
      });
    }

    const sale = new Sale({
      userId,
      customerId,
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: customerAddress,
      note: customerNote,
      products: saleProducts,
      totalAmount,
      saleDate,
    });

    await sale.save();

    const populatedSale = await Sale.findById(sale._id)
      .populate("customerId", "name email phone address note")
      .populate("userId", "name email")
      .populate("products.productId", "name sku");

    emitSaleEvent("saleCreated", populatedSale);

    return sendSuccess(res, 201, "Sale created successfully.", populatedSale);
  } catch (error) {
    next(error);
  }
};

export const getSales = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
      date,
    } = req.query;

    const userId = req.user._id;

    const skip = (page - 1) * limit;
    const query = { userId: userId };

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.saleDate = { $gte: start, $lte: end };
    }

    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, "i") } },
        { phone: { $regex: new RegExp(search, "i") } },
        { email: { $regex: new RegExp(search, "i") } },
        { address: { $regex: new RegExp(search, "i") } },
        { note: { $regex: new RegExp(search, "i") } },
      ];
    }
    const sales = await Sale.find(query)
      .populate("customerId", "name email phone address note")
      .populate("userId", "name email")
      .populate("products.productId", "name sku")
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Sale.countDocuments(query);

    return sendSuccess(res, 200, "Sales fetched successfully.", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: sales,
    });
  } catch (error) {
    next(error);
  }
};

export const getSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid sale ID format.");
    }

    const sale = await Sale.findOne({ _id: id, userId: userId })
      .populate("customerId", "name email phone address note")
      .populate("userId", "name email")
      .populate("products.productId", "name sku");

    if (!sale) {
      return sendError(res, 404, "Sale not found.");
    }

    return sendSuccess(res, 200, "Sale fetched successfully.", sale);
  } catch (error) {
    next(error);
  }
};

