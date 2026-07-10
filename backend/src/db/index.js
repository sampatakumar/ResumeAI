import mongoose from "mongoose";
import { env } from "../config/env.js";
import { DB_NAME } from "../constants/index.js";

const resolveMongoUri = (mongoUri, dbName) => {
  const normalizedUri = String(mongoUri || "").trim();

  if (!normalizedUri) {
    return normalizedUri;
  }

  try {
    const parsed = new URL(normalizedUri);
    const hasDatabasePath = parsed.pathname && parsed.pathname !== "/";

    if (hasDatabasePath) {
      return normalizedUri;
    }

    parsed.pathname = `/${dbName}`;
    return parsed.toString();
  } catch {
    return /\/[^/?]+(?:\?|$)/.test(normalizedUri) ? normalizedUri : `${normalizedUri.replace(/\/+$/, "")}/${dbName}`;
  }
};

export const connectDB = async () => {
  const resolvedMongoUri = resolveMongoUri(env.MONGODB_URI, DB_NAME);
  const connection = await mongoose.connect(resolvedMongoUri);
  return connection;
};
