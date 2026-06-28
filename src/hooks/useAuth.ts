import { useCallback, useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => auth?.currentUser ?? null);
  const [isLoading, setIsLoading] = useState(() => Boolean(auth && !auth.currentUser));

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      const currentUser = user ?? auth?.currentUser;
      if (!currentUser) return null;
      return currentUser.getIdToken(forceRefreshToken);
    },
    [user]
  );

  return {
    isLoading,
    isAuthenticated: !!user,
    fetchAccessToken,
  };
}
