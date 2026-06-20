import { create } from "zustand";

// Ephemeral, NON-persisted UI flags (reset every load). Kept separate from the
// persisted funnel store so transient state never leaks into a saved snapshot.
//
// crisisActive: the chat crisis short-circuit fired this session. While set, the
// app suppresses growth nudges (A2HS install prompt) — a user in crisis must not
// be marketed to (constitution §9: vulnerable users first). P1-4.
interface UIState {
  crisisActive: boolean;
  setCrisisActive: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  crisisActive: false,
  setCrisisActive: (crisisActive) => set({ crisisActive }),
}));
