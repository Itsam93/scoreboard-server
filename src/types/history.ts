import type {
  ScoreCommand,
} from "./score";

export interface HistoryEntry {
  id: string;

  timestamp: number;

  command: ScoreCommand;
}  