import mongoose from "mongoose";

// YYYY-MM-DD format
export const getDailyDate = () => new Date().toISOString().split("T")[0];

const analyticsSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      default: getDailyDate,
      unique: true,
      index: true
    },
    apiHits: {
      type: Map,
      of: Number,
      default: {}
    },
    rateLimitHits: {
      type: Number,
      default: 0
    },
    groqRequests: {
      type: Number,
      default: 0
    },
    newUsers: {
      type: Number,
      default: 0
    },
    portfoliosPublished: {
      type: Number,
      default: 0
    },
    resumesUploaded: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export const Analytics = mongoose.model("Analytics", analyticsSchema);

export const incrementDailyCounter = async (field, amount = 1) => {
  try {
    const date = getDailyDate();
    await Analytics.updateOne({ date }, { $inc: { [field]: amount } }, { upsert: true });
  } catch (error) {
    console.error("[Analytics Error] Failed to increment counter", error);
  }
};

export const logApiHit = async (route) => {
  try {
    const date = getDailyDate();
    // Use . replace to strip out dot-notation causing mongoose nesting issues
    const sanitizedRoute = route.replace(/\./g, "_");
    await Analytics.updateOne(
      { date },
      { $inc: { [`apiHits.${sanitizedRoute}`]: 1 } },
      { upsert: true }
    );
  } catch (error) {
    console.error("[Analytics Error] Failed to log API hit", error);
  }
};
