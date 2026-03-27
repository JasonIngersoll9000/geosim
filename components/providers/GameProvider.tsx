"use client";

import { createContext, useContext, useReducer, ReactNode } from "react";
import type { Scenario } from "@/lib/types/simulation";

interface GameState {
  scenarioId: string | null;
  branchId: string | null;
  currentCommitId: string | null;
  turnNumber: number;
  turnPhase: "planning" | "resolution" | "reaction" | "judging" | "complete";

  gameMode: "observer" | "single_actor" | "free_roam";
  userControlledActors: string[];

  selectedActorId: string | null;
  selectedDecisionId: string | null;
  activeTab: "actors" | "decisions" | "events" | "chronicle";
  viewMode: "map" | "chronicle";

  omniscientView: boolean;
  perspectiveActorId: string | null;

  scenarioSnapshot: Scenario | null;

  isResolutionRunning: boolean;
  resolutionProgress: string;
}

type GameAction =
  | { type: "SET_SCENARIO"; payload: { scenarioId: string; branchId: string } }
  | {
      type: "SET_COMMIT";
      payload: {
        commitId: string;
        turnNumber: number;
        snapshot: Scenario;
      };
    }
  | {
      type: "SET_TURN_PHASE";
      payload: GameState["turnPhase"];
    }
  | { type: "SELECT_ACTOR"; payload: string | null }
  | { type: "SELECT_DECISION"; payload: string | null }
  | { type: "SET_ACTIVE_TAB"; payload: GameState["activeTab"] }
  | { type: "SET_VIEW_MODE"; payload: "map" | "chronicle" }
  | { type: "TOGGLE_OMNISCIENT" }
  | { type: "SET_PERSPECTIVE"; payload: string | null }
  | { type: "SET_RESOLUTION_RUNNING"; payload: boolean }
  | { type: "SET_RESOLUTION_PROGRESS"; payload: string }
  | { type: "LOAD_SCENARIO"; payload: Scenario }
  | { type: "RESET_TURN" };

const initialState: GameState = {
  scenarioId: null,
  branchId: null,
  currentCommitId: null,
  turnNumber: 0,
  turnPhase: "planning",

  gameMode: "observer",
  userControlledActors: [],

  selectedActorId: null,
  selectedDecisionId: null,
  activeTab: "actors",
  viewMode: "map",

  omniscientView: false,
  perspectiveActorId: null,

  scenarioSnapshot: null,

  isResolutionRunning: false,
  resolutionProgress: "",
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_SCENARIO":
      return {
        ...state,
        scenarioId: action.payload.scenarioId,
        branchId: action.payload.branchId,
      };

    case "SET_COMMIT":
      return {
        ...state,
        currentCommitId: action.payload.commitId,
        turnNumber: action.payload.turnNumber,
        scenarioSnapshot: action.payload.snapshot,
      };

    case "SET_TURN_PHASE":
      return { ...state, turnPhase: action.payload };

    case "SELECT_ACTOR":
      return { ...state, selectedActorId: action.payload };

    case "SELECT_DECISION":
      return { ...state, selectedDecisionId: action.payload };

    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };

    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.payload };

    case "TOGGLE_OMNISCIENT":
      return { ...state, omniscientView: !state.omniscientView };

    case "SET_PERSPECTIVE":
      return { ...state, perspectiveActorId: action.payload };

    case "SET_RESOLUTION_RUNNING":
      return { ...state, isResolutionRunning: action.payload };

    case "SET_RESOLUTION_PROGRESS":
      return { ...state, resolutionProgress: action.payload };

    case "LOAD_SCENARIO":
      return {
        ...state,
        scenarioSnapshot: action.payload,
        turnNumber: 4,
        turnPhase: "planning",
      };

    case "RESET_TURN":
      return {
        ...state,
        turnPhase: "planning",
        selectedDecisionId: null,
        isResolutionRunning: false,
        resolutionProgress: "",
      };

    default:
      return state;
  }
}

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
