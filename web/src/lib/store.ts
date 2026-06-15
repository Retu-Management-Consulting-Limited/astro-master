import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Chart, BirthInput } from "./astro/chart";
import type { FirstRead } from "./reading/generate";
import type { Gender } from "./ai/molly";

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
  gender?: Gender;
  joinedAt?: number;  // epoch ms of first chart — honest "认识 N 天"
  // real daily-loop signals (replace the dead 说中了吗 / mood controls on /today)
  dailyHits?: number;        // 「说中了吗」→ 是这样
  dailyMisses?: number;      // 「说中了吗」→ 其实没有
  checkinDays?: string[];    // distinct yyyy-mm-dd the user engaged (verdict or mood)
  hasHydrated: boolean;
  authChecked: boolean;      // AuthHydration finished /api/auth/me reconcile (session flag, not persisted)
  setChart: (b: BirthInput, bf: BirthForm, c: Chart) => void;
  setFirstRead: (r: FirstRead) => void;
  setAsc: (s: string) => void;
  setNickname: (n: string) => void;
  setGender: (g: Gender) => void;
  recordVerdict: (hit: boolean, dayKey: string) => void;
  recordCheckin: (dayKey: string) => void;
  setHasHydrated: (v: boolean) => void;
  setAuthChecked: (v: boolean) => void;
  loadServer: (p: Partial<Pick<FunnelState, "birth" | "birthForm" | "chart" | "firstRead" | "nickname" | "gender" | "joinedAt">>) => void;
  reset: () => void;
}

// The subset persisted to a user's server account (and to localStorage).
export type FunnelSnapshot = Pick<FunnelState, "birth" | "birthForm" | "chart" | "firstRead" | "nickname" | "gender" | "joinedAt">;
export function snapshotOf(s: FunnelState): FunnelSnapshot {
  return { birth: s.birth, birthForm: s.birthForm, chart: s.chart, firstRead: s.firstRead, nickname: s.nickname, gender: s.gender, joinedAt: s.joinedAt };
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
      authChecked: false,
      setAuthChecked: (authChecked) => set({ authChecked }),
      setChart: (birth, birthForm, chart) =>
        set((s) => ({ birth, birthForm, chart, joinedAt: s.joinedAt ?? Date.now() })),
      setFirstRead: (firstRead) => set({ firstRead }),
      setAsc: (ascCandidate) => set({ ascCandidate }),
      setNickname: (nickname) => set({ nickname }),
      setGender: (gender) => set({ gender }),
      recordVerdict: (hit, dayKey) =>
        set((s) => ({
          dailyHits: (s.dailyHits ?? 0) + (hit ? 1 : 0),
          dailyMisses: (s.dailyMisses ?? 0) + (hit ? 0 : 1),
          checkinDays: s.checkinDays?.includes(dayKey) ? s.checkinDays : [...(s.checkinDays ?? []), dayKey],
        })),
      recordCheckin: (dayKey) =>
        set((s) => ({
          checkinDays: s.checkinDays?.includes(dayKey) ? s.checkinDays : [...(s.checkinDays ?? []), dayKey],
        })),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      // Load a snapshot pulled from the user's server account (cross-device).
      loadServer: (p) =>
        set({ birth: p.birth, birthForm: p.birthForm, chart: p.chart, firstRead: p.firstRead, nickname: p.nickname, gender: p.gender, joinedAt: p.joinedAt }),
      reset: () => set({ birth: undefined, birthForm: undefined, chart: undefined, firstRead: undefined, ascCandidate: undefined, nickname: undefined, gender: undefined, joinedAt: undefined, dailyHits: undefined, dailyMisses: undefined, checkinDays: undefined }),
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
        gender: s.gender,
        joinedAt: s.joinedAt,
        dailyHits: s.dailyHits,
        dailyMisses: s.dailyMisses,
        checkinDays: s.checkinDays,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
