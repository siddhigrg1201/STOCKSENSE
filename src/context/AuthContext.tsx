import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Fetch user data from Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Use onSnapshot for real-time user profile updates
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
          } else {
            // Create initial user profile if it doesn't exist
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "User",
              email: firebaseUser.email || "",
              settings: {
                twoFactor: false,
                biometric: false,
                dataSharing: true,
                notifications: {
                  email: true,
                  push: true,
                  marketAlerts: true
                },
                language: "English",
                region: "United States",
                market: "GLOBAL",
                currency: "USD",
                subscription: {
                  plan: "Free",
                  status: "Active",
                  nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
              }
            };
            setDoc(userDocRef, newUser).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`));
            setUser(newUser);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });

        return () => unsubscribeUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = (user: User) => {
    setUser(user);
  };

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (email: string, pass: string, name: string) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(firebaseUser, { displayName: name });
    
    // Create initial user profile in Firestore
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const newUser: User = {
      id: firebaseUser.uid,
      name: name,
      email: email,
      settings: {
        twoFactor: false,
        biometric: false,
        dataSharing: true,
        notifications: {
          email: true,
          push: true,
          marketAlerts: true
        },
        language: "English",
        region: "United States",
        market: "GLOBAL",
        currency: "USD",
        subscription: {
          plan: "Free",
          status: "Active",
          nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    };
    await setDoc(userDocRef, newUser);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.id);
      await setDoc(userDocRef, updates, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signIn, signUp, updateUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
