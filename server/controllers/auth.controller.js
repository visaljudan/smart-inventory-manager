import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitUserEvent } from "../utils/socketioFunctions.js";

// Compeleted
export const signup = async (req, res, next) => {
  try {
    const { name, username, email, password, avatar } = req.body;
    if (!name) return sendError(res, 400, "Name is required.");
    if (!username) return sendError(res, 400, "Username is required.");
    if (!email) return sendError(res, 400, "Email is required.");
    if (!password) return sendError(res, 400, "Password is required.");
    if (password.length < 6)
      return sendError(
        res,
        400,
        "Password must be at least 6 characters long."
      );

    if (await User.findOne({ username }))
      return sendError(res, 409, "Username already exists.");
    if (await User.findOne({ email }))
      return sendError(res, 409, "Email already exists.");

    const hashedPassword = await bcryptjs.hash(password, 10);

    const role = await Role.findOne({ slug: "staff" });
    if (!role) return sendError(res, 404, "Role not found.");

    const newUser = new User({
      name,
      username,
      email,
      password: hashedPassword,
      roleId: role._id,
      avatar:
        avatar ||
        "https://static.vecteezy.com/system/resources/previews/037/135/884/non_2x/active-user-verified-user-modern-icon-illustration-free-png.png",
    });

    await newUser.save();
    const token = jwt.sign({ user: newUser._id }, process.env.JWT_SECRET);

    const populatedUser = await User.findOne({ _id: newUser._id }).populate(
      "roleId"
    );

    emitUserEvent("userCreated", populatedUser);

    return sendSuccess(res, 201, "User created successfully", {
      user: populatedUser,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const signin = async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail) {
      return sendError(res, 400, "Username/Email is required.");
    }
    if (!password) {
      return sendError(res, 400, "Password is required.");
    }

    let user;
    if (usernameOrEmail.includes("@")) {
      user = await User.findOne({ email: usernameOrEmail });
    } else {
      user = await User.findOne({ username: usernameOrEmail });
    }

    if (!user) {
      return sendError(res, 404, "User not found.");
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 409, "Invalid password.");
    }

    const token = jwt.sign({ user: user._id }, process.env.JWT_SECRET);

    const populatedUser = await User.findById(user._id).populate("roleId");

    return sendSuccess(res, 200, "User signed in successfully", {
      user: populatedUser,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const google = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      const token = jwt.sign({ user: user._id }, process.env.JWT_SECRET);

      const populatedUser = await User.findById(user._id).populate("roleId");

      return sendSuccess(res, 200, "User signed in successfully", {
        user: populatedUser,
        token,
      });
    } else {
      const generatedPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);

      let baseUsername = req.body.username
        .trim()
        .toLowerCase()
        .replace(/[\d\W]+/g, "");
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      const finalUsername = `${baseUsername}${randomNumber}`;

      const finalName = req.body.username.replace(/[\d\W]+/g, " ");

      const role = await Role.findOne({ slug: "staff" });
      if (!role) return sendError(res, 404, "Role not found.");

      const newUser = new User({
        name: finalName,
        username: finalUsername,
        email: req.body.email,
        password: hashedPassword,
        avatar: req.body.avatar,
        roleId: role._id,
      });

      await newUser.save();

      const token = jwt.sign({ user: newUser._id }, process.env.JWT_SECRET);

      const populatedUser = await User.findById(newUser._id).populate("roleId");

      return sendSuccess(res, 200, "User signed up successfully", {
        user: populatedUser,
        token,
      });
    }
  } catch (error) {
    next(error);
  }
};
