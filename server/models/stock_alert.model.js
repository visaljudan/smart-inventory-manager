import mongoose from "mongoose";

const stockAlertSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currentQuantity: {
      type: Number,
      required: true,
    },
    reorderLevel: {
      type: Number,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "dismissed"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const StockAlert = mongoose.model("StockAlert", stockAlertSchema);

export default StockAlert;
