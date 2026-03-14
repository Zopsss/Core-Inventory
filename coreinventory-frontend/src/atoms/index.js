import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// ── Auth ────────────────────────────────────────────────────────────
export const tokenAtom   = atomWithStorage("ci_token", null);
export const userAtom    = atomWithStorage("ci_user",  null);

export const isAuthAtom = atom((get) => !!get(tokenAtom));

// ── UI ──────────────────────────────────────────────────────────────
export const sidebarOpenAtom    = atom(true);
export const commandPaletteAtom = atom(false);

// ── Filters (dashboard) ────────────────────────────────────────────
export const dashboardWarehouseAtom = atom("");
