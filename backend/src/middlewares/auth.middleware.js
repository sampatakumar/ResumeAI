import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { env } from "../config/env.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const jwksClient = jwksRsa({
  jwksUri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

const getGooglePublicKey = (header, callback) => {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
};

export const verifyFirebaseToken = asyncHandler(async (req, _res, next) => {
  const authHeader = req.header("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) {
    throw new ApiError(401, "Missing Firebase ID token");
  }

  // Verify the JWT locally (audience and issuer checks)
  const decoded = await new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getGooglePublicKey,
      {
        algorithms: ["RS256"],
        audience: env.FIREBASE_PROJECT_ID,
        issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`
      },
      (err, decodedToken) => {
        if (err) return reject(new ApiError(401, `Invalid token: ${err.message}`));
        resolve(decodedToken);
      }
    );
  });

  // Hydrate the user once in the middleware
  const uid = decoded.sub || decoded.uid;
  const user = await User.findOne({ firebaseUid: uid });
  
  if (!user && req.path !== "/firebase/sign-in") {
    throw new ApiError(404, "User not registered in the system. Please sign in first.");
  }

  decoded.uid = uid;
  req.auth = {
    uid,
    email: decoded.email || null,
    name: decoded.name || null,
    picture: decoded.picture || null,
    decodedToken: decoded
  };
  req.user = user;

  next();
});
