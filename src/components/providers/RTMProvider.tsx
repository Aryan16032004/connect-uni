"use client";

import { createContext, useContext } from "react";

const RTMContext = createContext<any>(null);
export const useRTM = () => useContext(RTMContext);

export function RTMProvider({ children }: { children: React.ReactNode }) {
    // No-op provider since Agora RTM is removed.
    return <RTMContext.Provider value={{}}>{children}</RTMContext.Provider>;
}
