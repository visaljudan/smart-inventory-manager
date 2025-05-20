import mongoose from "mongoose";

const salesPredictionSchema = new mongoose.Schema(
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
    predicted_sales_next_week: {
      type: Number,
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.75,
    },
    prediction_date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const SalesPrediction = mongoose.model(
  "SalesPrediction",
  salesPredictionSchema
);

export default SalesPrediction;
