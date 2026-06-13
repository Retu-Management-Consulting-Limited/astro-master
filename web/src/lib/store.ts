import { create } from "zustand";
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
  setChart: (b: BirthInput, bf: BirthForm, c: Chart) => void;
  setFirstRead: (r: FirstRead) => void;
  setAsc: (s: string) => void;
  setNickname: (n: string) => void;
  reset: () => void;
}

export const useFunnel = create<FunnelState>((set) => ({
  setChart: (birth, birthForm, chart) => set({ birth, birthForm, chart }),
  setFirstRead: (firstRead) => set({ firstRead }),
  setAsc: (ascCandidate) => set({ ascCandidate }),
  setNickname: (nickname) => set({ nickname }),
  reset: () => set({ birth: undefined, chart: undefined, firstRead: undefined, nickname: undefined }),
}));
