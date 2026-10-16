import type {
  DynamicSubTeam,
  PhenomenalSubTeam,
} from "./team";

export type ScoreCommand =
  | {
      team: "phenomenal";
      subTeam: PhenomenalSubTeam;
      operation:
        | "increment"
        | "decrement";
    }
  | {
      team: "dynamic";
      subTeam: DynamicSubTeam;
      operation:
        | "increment"
        | "decrement";
    };