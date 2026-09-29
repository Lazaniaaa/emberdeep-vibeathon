import { create } from "zustand";
import type { StationId } from "@/game/camp";

/** A request from anywhere in the app to open a building in the camp, for example the Vault from the run report. */
export const useUi = create<{ requestedPanel: StationId | null; request: (id: StationId) => void; clear: () => void }>()(set => ({
  requestedPanel: null,
  request: id => set({ requestedPanel: id }),
  clear: () => set({ requestedPanel: null }),
}));
