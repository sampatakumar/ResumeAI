import { User } from "../models/user.models.js";
import { incrementDailyCounter } from "../models/analytics.models.js";

export const upsertUserFromFirebase = async (decodedToken) => {
  const firebaseUid = decodedToken.uid;
  const nextEmail = decodedToken.email || null;
  const nextName = decodedToken.name || null;
  const nextPhoto = decodedToken.picture || null;

  let user = await User.findOne({ firebaseUid });

  if (!user) {
    user = await User.create({
      firebaseUid,
      email: nextEmail,
      displayName: nextName,
      photoURL: nextPhoto,
      lastLoginAt: new Date()
    });
    incrementDailyCounter("newUsers", 1);
    return user;
  }

  // Preserve user-edited profile fields. We only hydrate missing basics from Firebase.
  user.email = nextEmail || user.email || null;
  if (!user.displayName && nextName) {
    user.displayName = nextName;
  }
  if (!user.photoURL && nextPhoto) {
    user.photoURL = nextPhoto;
  }
  user.lastLoginAt = new Date();
  await user.save();

  return user;
};
