import { EventEmitter } from "node:events";

export interface ContributionVerifiedEvent {
  contributionId: string;
  groupId: string;
  amountEspees: number;
  amountNaira: number;
}

export interface ContributionRecordedEvent
  extends ContributionVerifiedEvent {
  recordedByRole: "admin" | "groupManager";
  recordedByManagerId?: string | null;
}

export interface ContributionDeletedEvent {
  contributionId: string;
  groupId: string;
  amountEspees: number;
  amountNaira: number;
}

type ContributionRecordedHandler = (
  event: ContributionRecordedEvent,
) => void | Promise<void>;

type ContributionVerifiedHandler = (
  event: ContributionVerifiedEvent,
) => void | Promise<void>;

type ContributionDeletedHandler = (
  event: ContributionDeletedEvent,
) => void | Promise<void>;

class LeagueEventBus extends EventEmitter {
  // New contribution recorded event.
  publishContributionRecorded(
    event: ContributionRecordedEvent,
  ): void {
    this.emit("contribution:recorded", event);
  }

  onContributionRecorded(
    handler: ContributionRecordedHandler,
  ): void {
    this.on("contribution:recorded", handler);
  }

  // Legacy event retained for compatibility with existing listeners.
  publishContributionVerified(
    event: ContributionVerifiedEvent,
  ): void {
    this.emit("contribution:verified", event);
  }

  onContributionVerified(
    handler: ContributionVerifiedHandler,
  ): void {
    this.on("contribution:verified", handler);
  }

  // Permanently deleted contribution event.
  publishContributionDeleted(
    event: ContributionDeletedEvent,
  ): void {
    this.emit("contribution:deleted", event);
  }

  onContributionDeleted(
    handler: ContributionDeletedHandler,
  ): void {
    this.on("contribution:deleted", handler);
  }
}

export const leagueEvents = new LeagueEventBus();
