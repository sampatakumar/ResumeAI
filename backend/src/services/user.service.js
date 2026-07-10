import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";

export const findUserByFirebaseUid = async (firebaseUid) => {
  const user = await User.findOne({ firebaseUid });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};
