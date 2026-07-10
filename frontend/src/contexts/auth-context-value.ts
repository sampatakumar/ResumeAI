import { createContext } from "react";
import type { BackendUser } from "@/contexts/auth-context-types";
import type { User } from "firebase/auth";

export type AuthContextValue = {
  firebaseUser: User | null;
  backendUser: BackendUser | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
