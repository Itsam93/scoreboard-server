export type TeamId =
  | "phenomenal"
  | "dynamic";

export type PhenomenalSubTeam =
  | "women"
  | "sisters";

export type DynamicSubTeam =
  | "men"
  | "brothers";

export interface PhenomenalScore {
  women: number;
  sisters: number;
  total: number;
}

export interface DynamicScore {
  men: number;
  brothers: number;
  total: number;
}