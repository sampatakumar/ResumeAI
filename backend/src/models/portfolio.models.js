import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    projectName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    url: {
      type: String,
      default: "",
      trim: true
    },
    userPreference: {
      type: String,
      default: "",
      trim: true
    },
    customDomain: {
      type: String,
      default: "",
      trim: true
    },
    publishedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const Portfolio = mongoose.model("Portfolio", portfolioSchema);
