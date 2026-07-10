import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    format: {
      type: String,
      enum: ["PDF", "DOCX", "TXT", "TEX", "IMAGE"],
      default: "PDF"
    },
    sections: {
      type: Number,
      min: 1,
      max: 30,
      default: 5
    },
    content: {
      type: String,
      trim: true,
      default: ""
    },
    originalFileName: {
      type: String,
      trim: true,
      default: ""
    },
    storedFileName: {
      type: String,
      trim: true,
      default: ""
    },
    filePath: {
      type: String,
      trim: true,
      default: ""
    },
    mimeType: {
      type: String,
      trim: true,
      default: ""
    },
    fileSize: {
      type: Number,
      default: 0
    },
    storageProvider: {
      type: String,
      trim: true,
      default: "supabase"
    },
    supabaseStoragePath: {
      type: String,
      trim: true,
      default: ""
    },
    supabaseStorageBucket: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

export const Resume = mongoose.model("Resume", resumeSchema);
