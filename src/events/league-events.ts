import { EventEmitter } from "node:events";

export interface ContributionVerifiedEvent {
  contributionId: string;
  groupId: string;
  amountEspees: number;
  amountNaira: number;
}

type ContributionVerifiedHandler = (
  event: ContributionVerifiedEvent,
) => void | Promise<void>;

class LeagueEventBus extends EventEmitter {
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
