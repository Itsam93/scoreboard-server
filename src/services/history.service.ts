import type {
  ScoreCommand,
} from "@/types";

export interface HistoryEntry {
  id: string;
  timestamp: number;
  command: ScoreCommand;
}

export class HistoryService {
  private readonly entries: HistoryEntry[] = [];

  record(
    command: ScoreCommand
  ): HistoryEntry {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      command,
    };

    this.entries.push(entry);

    return entry;
  }

  getAll(): HistoryEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
  }

  latest():
    | HistoryEntry
    | undefined {
    return this.entries.at(-1);
  }
}

export const historyService =
  new HistoryService();