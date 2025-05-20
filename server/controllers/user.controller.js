import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitUserEvent } from "../utils/socketioFunctions.js";

export const getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
      roleSlug,
      status,
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    // Validate `roleSlug`
    if (roleSlug) {
      const role = await Role.findOne({ slug: roleSlug }).select("_id");
      if (!role) {
        return sendError(res, 404, "Role not found.");
      }
      query.roleId = role._id;
    }

    // Validate `status`
    if (
      status &&
      !["active", "inactive", "suspended", "banned", "deleted"].includes(status)
    ) {
      return sendError(
        res,
        400,
        "Status must be 'active', 'inactive', 'suspended', 'banned', or 'deleted'."
      );
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, "i") } },
        { username: { $regex: new RegExp(search, "i") } },
        { email: { $regex: new RegExp(search, "i") } },
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Fetch users with roles
    const users = await User.find(query)
      .populate("roleId")
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit));

    // Count total users after filtering
    const total = users.length;

    return sendSuccess(res, 200, "Users fetched successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find user by Id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid User ID format.");
    }

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, 404, "User not found.");
    }

    const populatedUser = await User.findById(user._id).populate("roleId");

    return sendSuccess(
      res,
      200,
      "User details fetched successfully.",
      populatedUser
    );
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, username, email, avatar, password, status } = req.body;

    // User ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid user ID format.");
    }
    const user = await User.findById(id);
    if (!user) {
      return sendError(res, 404, "User not found.");
    }

    // Name
    if (name && name != user.name) {
      user.name = name;
    }

    // Username
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return sendError(res, 409, "Username already exists.");
      }
      user.username = username;
    }

    // Email
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return sendError(res, 409, "Email already exists.");
      }
      user.email = email;
    }

    // Avatar
    if (avatar && avatar != user.avatar) {
      user.avatar = avatar;
    }

    // Password
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    //Status
    if (
      status &&
      !["active", "inactive", "suspended", "banned", "deleted"].includes(status)
    ) {
      return sendError(
        res,
        400,
        "Status must be 'active' or 'inactive' or 'suspended' or 'banned' abd 'deleted'."
      );
    }
    if (status && status !== user.status) {
      user.status = status;
    }

    //Update user
    await user.save();
    const populatedUser = await User.findById(user._id).populate("roleId");

    // Socket event
    emitUserEvent("userUpdated", populatedUser);

    return sendSuccess(res, 200, "User updated successfully", populatedUser);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // User ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid User ID format.");
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    // Socket event
    emitUserEvent("userDeleted", id);

    return sendSuccess(res, 200, "User deleted successfully.");
  } catch (error) {
    next(error);
  }
};

export const updateOwnUser = async (req, res, next) => {
  try {
    const { name, username, email, avatar, password, status } = req.body;
    const userId = req.user._id;
    // User ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, userId);
    }
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, "User not found.");
    }

    // Name
    if (name && name != user.name) {
      user.name = name;
    }

    // Username
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return sendError(res, 409, "Username already exists.");
      }
      user.username = username;
    }

    // Email
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return sendError(res, 409, "Email already exists.");
      }
      user.email = email;
    }

    // Avatar
    if (avatar && avatar != user.avatar) {
      user.avatar = avatar;
    }

    // Password
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    //Status
    if (
      status &&
      !["active", "inactive", "suspended", "banned", "deleted"].includes(status)
    ) {
      return sendError(
        res,
        400,
        "Status must be 'active' or 'inactive' or 'suspended' or 'banned' abd 'deleted'."
      );
    }
    if (status && status !== user.status) {
      user.status = status;
    }

    //Update user
    await user.save();
    const populatedUser = await User.findById(user._id).populate("roleId");

    const token = jwt.sign({ user: user._id }, process.env.JWT_SECRET);

    // Socket event
    emitUserEvent("userUpdated", populatedUser);

    return sendSuccess(res, 200, "User updated successfully", {
      user: populatedUser,
      token,
    });
  } catch (error) {
    next(error);
  }
};

//Done
