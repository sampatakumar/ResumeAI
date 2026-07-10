import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true
    },
    displayName: {
      type: String,
      trim: true
    },
    headline: {
      type: String,
      trim: true,
      default: ""
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    photoURL: {
      type: String,
      trim: true
    },
    about: {
      type: String,
      trim: true,
      default: ""
    },
    customDomain: {
      type: String,
      trim: true,
      default: ""
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    linkedInUrl: {
      type: String,
      trim: true,
      default: ""
    },
    githubUrl: {
      type: String,
      trim: true,
      default: ""
    },
    leetCodeId: {
      type: String,
      trim: true,
      default: ""
    },
    geeksForGeeksId: {
      type: String,
      trim: true,
      default: ""
    },
    education: {
      type: [String],
      default: []
    },
    educationEntries: {
      type: [
        {
          degree: { type: String, trim: true, default: "" },
          specialization: { type: String, trim: true, default: "" },
          college: { type: String, trim: true, default: "" },
          location: { type: String, trim: true, default: "" },
          endDate: { type: String, trim: true, default: "" },
          grade: { type: String, trim: true, default: "" }
        }
      ],
      default: []
    },
    skillLanguages: {
      type: [String],
      default: []
    },
    skillFrameworks: {
      type: [String],
      default: []
    },
    skillTools: {
      type: [String],
      default: []
    },
    skillLibraries: {
      type: [String],
      default: []
    },
    skillSections: {
      type: [
        {
          title: { type: String, trim: true, default: "" },
          skills: { type: [String], default: [] }
        }
      ],
      default: []
    },
    experience: {
      type: [
        {
          role: { type: String, trim: true, default: "" },
          company: { type: String, trim: true, default: "" },
          location: { type: String, trim: true, default: "" },
          date: { type: String, trim: true, default: "" },
          bullets: { type: [String], default: [] }
        }
      ],
      default: []
    },
    achievements: {
      type: [
        {
          title: { type: String, trim: true, default: "" },
          date: { type: String, trim: true, default: "" },
          bullets: { type: [String], default: [] }
        }
      ],
      default: []
    },
    lastLoginAt: {
      type: Date,
      default: Date.now
    },
    onboardingCompletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model("User", userSchema);
