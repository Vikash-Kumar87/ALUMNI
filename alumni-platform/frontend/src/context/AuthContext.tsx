import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { apiService } from '../services/api';
import { User } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: string, extraData: Record<string, unknown>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (role?: string) => Promise<{ isNewUser: boolean; user: FirebaseUser }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Use globalThis to keep the same context reference across HMR reloads.
// Without this, Vite HMR recreates the context object on every file save,
// which breaks useContext lookups and crashes ProtectedRoute.
declare global { var __AuthContext: React.Context<AuthContextType | undefined> | undefined; }
const AuthContext: React.Context<AuthContextType | undefined> =
  globalThis.__AuthContext ?? (globalThis.__AuthContext = createContext<AuthContextType | undefined>(undefined));

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Prevents duplicate fetchProfile when signInWithGoogle already fetched it
  const skipNextFetch = useRef(false);

  const fetchProfile = async (user: FirebaseUser) => {
    // 1. Try sessionStorage cache first (instant — no network)
    try {
      const cached = sessionStorage.getItem(`up_${user.uid}`);
      if (cached) {
        setUserProfile(JSON.parse(cached));
        return;
      }
    } catch {}
    // 2. Fetch from backend
    try {
      const token = await user.getIdToken();
      const res = await apiService.post<{ user: User }>('/auth/login', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserProfile(res.data.user);
      try { sessionStorage.setItem(`up_${user.uid}`, JSON.stringify(res.data.user)); } catch {}
    } catch {
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        if (skipNextFetch.current) {
          skipNextFetch.current = false; // profile already set — skip duplicate
        } else {
          await fetchProfile(user);
        }
      } else {
        setUserProfile(null);
        // Clear cached profile on logout
        try {
          Object.keys(sessionStorage)
            .filter(k => k.startsWith('up_'))
            .forEach(k => sessionStorage.removeItem(k));
        } catch {}
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: string,
    extraData: Record<string, unknown>
  ) => {
    // Prevent onAuthStateChanged from auto-fetching profile for the newly created session
    skipNextFetch.current = true;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });

    const token = await userCredential.user.getIdToken();
    await apiService.post('/auth/signup', {
      uid: userCredential.user.uid,
      name,
      email,
      role,
      ...extraData,
    }, { headers: { Authorization: `Bearer ${token}` } });

    // Sign out immediately so the user must log in manually
    await signOut(auth);
  };

  const signIn = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    skipNextFetch.current = true; // we load profile here — skip duplicate in onAuthStateChanged
    await fetchProfile(credential.user);
    toast.success('Welcome back!');
  };

  const signInWithGoogle = async (role?: string): Promise<{ isNewUser: boolean; user: FirebaseUser }> => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const token = await user.getIdToken();
    skipNextFetch.current = true; // we load profile here — skip duplicate in onAuthStateChanged
    try {
      const res = await apiService.post<{ user: User }>('/auth/login', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserProfile(res.data.user);
      try { sessionStorage.setItem(`up_${user.uid}`, JSON.stringify(res.data.user)); } catch {}
      return { isNewUser: false, user };
    } catch {
      // New user — create a basic profile if a role was chosen (signup flow)
      if (role) {
        await apiService.post('/auth/signup', {
          uid: user.uid,
          name: user.displayName || 'User',
          email: user.email,
          role,
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      return { isNewUser: true, user };
    }
  };

  const logout = async () => {
    try {
      const token = await currentUser?.getIdToken();
      if (token) {
        await apiService.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } finally {
      // Clear cached profile before signing out
      if (currentUser) {
        try { sessionStorage.removeItem(`up_${currentUser.uid}`); } catch {}
      }
      await signOut(auth);
      setUserProfile(null);
      toast.success('Logged out successfully');
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      // Invalidate cache so the fresh data is fetched
      try { sessionStorage.removeItem(`up_${currentUser.uid}`); } catch {}
      await fetchProfile(currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      logout,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
