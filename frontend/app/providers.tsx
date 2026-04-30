"use client";
import { SessionProvider } from "next-auth/react";
import { CharacterProvider } from "./context/CharacterContext";
import { GlobalCharacter } from "./components/GlobalCharacter";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CharacterProvider>
        {children}
        <GlobalCharacter />
      </CharacterProvider>
    </SessionProvider>
  );
}
