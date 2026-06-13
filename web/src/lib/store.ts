import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Chart, BirthInput } from "./astro/chart";
import type { FirstRead } from "./reading/generate";

export interface BirthForm {
  date: string;       // yyyy-mm-dd
  time: string;       // hh:mm
  knownTime: boolean;
  country: string;
  city: string;
}

interface FunnelState {
  birth?: BirthInput;
  birthForm?: BirthForm;
  chart?: Chart;
  firstRead?: FirstRead;
  ascCandidate?: string;
  nickname?: string;
  joinedAt?: number;  // epoch ms of first chart — honest "认识 N 天"
  hasHydrated: boolean;
  setChart: (b: BirthInput, bf: BirthForm, c: Chart) => void;
  setFirstRead: (r: FirstRead) => void;
  setAsc: (s: string) => void;
  setNickname: (n: string) => void;
  setHasHydrated: (v: boolean) => void;
  reset: () => void;
}

// Persisted to localStorage so a returning user — especially one relaunching
// the installed PWA each morning — keeps their chart instead of being kicked
// back to /input. Chart/FirstRead are plain JSON (no Date/functions), safe to
// serialize. `hasHydrated` gates redirects until rehydration finishes so we
// don't bounce returning users to /input during the first client frame.
export const useFunnel = create<FunnelState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      setChart: (birth, birthForm, chart) =>
        set((s) => ({ birth, birthForm, chart, joinedAt: s.joinedAt ?? Date.now() })),
      setFirstRead: (firstRead) => set({ firstRead }),
      setAsc: (ascCandidate) => set({ ascCandidate }),
      setNickname: (nickname) => set({ nickname }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      reset: () => set({ birth: undefined, birthForm: undefined, chart: undefined, firstRead: undefined, ascCandidate: undefined, nickname: undefined, joinedAt: undefined }),
    }),
    {
      name: "molly-funnel",
      // SSR-safe: never touch localStorage on the server.
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      // Rehydrate manually after mount (see StoreHydration) so the server HTML
      // and the first client render agree (both pre-hydration → no chart),
      // avoiding a hydration mismatch.
      skipHydration: true,
      partialize: (s) => ({
        birth: s.birth,
        birthForm: s.birthForm,
        chart: s.chart,
        firstRead: s.firstRead,
        ascCandidate: s.ascCandidate,
        nickname: s.nickname,
        joinedAt: s.joinedAt,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
