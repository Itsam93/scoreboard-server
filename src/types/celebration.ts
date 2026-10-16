export type Celebration =
  | {
      team: "phenomenal";
      subTeam:
        | "women"
        | "sisters";
      duration: number;
      timestamp: number;
    }
  | {
      team: "dynamic";
      subTeam:
        | "men"
        | "brothers";
      duration: number;
      timestamp: number;
    };