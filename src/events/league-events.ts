
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

type ContributionRecordedHandler = (
  event: ContributionRecordedEvent,
) => void | Promise<void>;

type ContributionVerifiedHandler = (
  event: ContributionVerifiedEvent,
) => void | Promise<void>;

class LeagueEventBus extends EventEmitter {
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

  // Retained for compatibility with existing listeners.
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
}

export const leagueEvents = new LeagueEventBus();
