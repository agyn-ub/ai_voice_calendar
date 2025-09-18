"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fcl } from "@/lib/flow/config";

interface FlowUser {
  addr: string | null;
  loggedIn: boolean;
  cid?: string | null;
}

interface FlowContextType {
  user: FlowUser | null;
  loading: boolean;
  logIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const FlowContext = createContext<FlowContextType | undefined>(undefined);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FlowUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fcl.currentUser.subscribe(setUser);
    setLoading(false);
  }, []);

  const logIn = async () => {
    try {
      await fcl.authenticate();
    } catch (error) {
      console.error("Flow login error:", error);
    }
  };

  const logOut = async () => {
    try {
      await fcl.unauthenticate();
    } catch (error) {
      console.error("Flow logout error:", error);
    }
  };

  return (
    <FlowContext.Provider value={{ user, loading, logIn, logOut }}>
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error("useFlow must be used within a FlowProvider");
  }
  return context;
}