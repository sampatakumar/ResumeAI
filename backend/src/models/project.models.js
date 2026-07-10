import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
      default: ""
    },
    stack: {
      type: [String],
      default: []
    },
    date: {
      type: String,
      trim: true,
      default: ""
    },
    githubUrl: {
      type: String,
      trim: true,
      default: ""
    },
    demoUrl: {
      type: String,
      trim: true,
      default: ""
    },
    source: {
      type: String,
      enum: ["manual", "readme"],
      default: "manual"
    },
    readmeOriginalName: {
      type: String,
      trim: true,
      default: ""
    },
    readmeContent: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

export const Project = mongoose.model("Project", projectSchema);
