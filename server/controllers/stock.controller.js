import Stock from "../models/stock.model.js";
import { sendSuccess } from "../utils/response.js";

export const getStockStatements = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
      type,
      productId,
    } = req.query;

    const skip = (page - 1) * limit;
    const userId = req.user._id;

    const query = { userId };

    // Validate type
    if (type && !["in", "out"].includes(type)) {
      return sendError(res, 400, "Type must be either 'in' or 'out'.");
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by productId
    if (productId) {
      query.productId = productId;
    }

    // Search product name or SKU (via aggregation or population)
    let stockStatementsQuery = Stock.find(query)
      .populate("productId", "name sku")
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit));

    // Apply filtering by product name/SKU if search provided
    if (search) {
      // First find matching product IDs
      const matchingProducts = await Product.find({
        $or: [
          { name: { $regex: new RegExp(search, "i") } },
          { sku: { $regex: new RegExp(search, "i") } },
        ],
      }).select("_id");

      const productIds = matchingProducts.map((p) => p._id);
      query.productId = { $in: productIds };
      stockStatementsQuery = Stock.find(query)
        .populate("productId", "name sku")
        .sort({ [sort]: order === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(Number(limit));
    }

    const [statements, total] = await Promise.all([
      stockStatementsQuery,
      Stock.countDocuments(query),
    ]);

    return sendSuccess(res, 200, "Stock statements fetched successfully.", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: statements,
    });
  } catch (error) {
    next(error);
  }
};
