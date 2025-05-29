import mongoose from "mongoose";
import slugify from "slugify";
import Category from "../models/category.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitCategoryEvent } from "../utils/socketioFunctions.js";

// Create
export const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user?._id;

    if (!name)
      return sendError(res, 400, "Name is required to create a category.");

    const existingName = await Category.findOne({
      userId: userId,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingName)
      return sendError(res, 409, "Category name already exists.");

    const slug = slugify(name, { lower: true, strict: true, trim: true });
    const existingSlug = await Category.findOne({
      userId: userId,
      slug: { $regex: new RegExp(`^${slug}$`, "i") },
    });
    if (existingSlug)
      return sendError(res, 409, "Category slug already exists.");

    const category = new Category({ userId: userId, name, slug });
    await category.save();

    emitCategoryEvent("categoryCreated", category);

    return sendSuccess(res, 201, "Category created successfully.", category);
  } catch (error) {
    next(error);
  }
};

// Get All
export const getCategories = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
      status,
    } = req.query;

    const userId = req.user?._id;
    const skip = (page - 1) * limit;
    const query = { userId: userId };

    if (status && !["active", "inactive"].includes(status)) {
      return sendError(res, 400, "Status must be 'active' or 'inactive'.");
    }

    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, "i") } },
        { slug: { $regex: new RegExp(search, "i") } },
        { description: { $regex: new RegExp(search, "i") } },
      ];
    }

    if (status) query.status = status;

    const categories = await Category.find(query)
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Category.countDocuments(query);

    return sendSuccess(res, 200, "Categories fetched successfully.", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// Get One
export const getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Category ID format.");
    }

    const category = await Category.findOne({ _id: id, userId: userId });
    if (!category) return sendError(res, 404, "Category not found");

    return sendSuccess(res, 200, "Category fetched successfully", category);
  } catch (error) {
    next(error);
  }
};

// Update
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Category ID format.");
    }

    const category = await Category.findOne({ _id: id, userId: userId });
    if (!category) return sendError(res, 404, "Category not found.");

    if (name && name !== category.name) {
      const existingName = await Category.findOne({
        userId: userId,
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });
      if (existingName)
        return sendError(res, 409, "Category name already exists.");

      category.name = name;
      category.slug = slugify(name, { lower: true, strict: true, trim: true });
    }

    if (status && !["active", "inactive"].includes(status)) {
      return sendError(res, 400, "Status must be 'active' or 'inactive'.");
    }

    if (status && status !== category.status) {
      category.status = status;
    }

    await category.save();
    emitCategoryEvent("categoryUpdated", category);

    return sendSuccess(res, 200, "Category updated successfully", category);
  } catch (error) {
    next(error);
  }
};

// Delete
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Category ID format");
    }

    const category = await Category.findOneAndDelete({
      _id: id,
      userId: userId,
    });
    if (!category) return sendError(res, 404, "Category not found");

    emitCategoryEvent("categoryDeleted", id);

    return sendSuccess(res, 200, "Category deleted successfully");
  } catch (error) {
    next(error);
  }
};
