import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase";
import { apiRequest } from "@/lib/api";
import { AuthContext } from "@/contexts/auth-context-value";
import type { AuthContextValue } from "@/contexts/auth-context-value";
import type { BackendUser } from "@/contexts/auth-context-types";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const response = await apiRequest<{ user: BackendUser }>("/auth/me");
      setBackendUser(response.data.user);
    } catch {
      setBackendUser(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setFirebaseUser(nextUser);

      if (!nextUser) {
        setIdToken(null);
        setBackendUser(null);
        setLoading(false);
        return;
      }

      try {
        const token = await nextUser.getIdToken();
        setIdToken(token);

        const response = await apiRequest<{ user: BackendUser }>("/auth/firebase/sign-in", {
          method: "POST",
          token
        });
        setBackendUser(response.data.user);
      } catch (error) {
        console.error("Backend sign-in synchronization failed", error);
        setBackendUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(firebaseAuth, googleProvider);
  };

  const signOutUser = async () => {
    await signOut(firebaseAuth);
    setFirebaseUser(null);
    setBackendUser(null);
    setIdToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        backendUser,
        idToken,
        loading,
        signInWithGoogle,
        signOutUser,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

