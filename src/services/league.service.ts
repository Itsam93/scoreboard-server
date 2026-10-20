import mongoose from "mongoose";

import { Contribution } from "../models/Contribution";
import { Group } from "../models/Group";
import { ClassificationRule } from "../models/ClassificationRule";

export class LeagueService {
  async getStandings() {
    const [groups, totals, rules] = await Promise.all([
      Group.find({ isActive: true })
        .populate("zoneId", "name")
        .sort({ name: 1 })
        .lean(),

      Contribution.aggregate<{
        _id: mongoose.Types.ObjectId;
        totalEspees: number;
        totalNaira: number;
        contributionCount: number;
      }>([
        {
          $match: {
            status: {
              $in: ["recorded", "verified"],
            },
          },
        },
        {
          $group: {
            _id: "$groupId",
            totalEspees: { $sum: "$amountEspees" },
            totalNaira: { $sum: "$amountNaira" },
            contributionCount: { $sum: 1 },
          },
        },
      ]),

      ClassificationRule.find({ isActive: true })
        .sort({ minEspees: -1, displayOrder: 1 })
        .lean(),
    ]);

    const totalsByGroup = new Map(
      totals.map((item) => [
        item._id.toString(),
        item,
      ]),
    );

    const standings = groups.map((group) => {
      const total = totalsByGroup.get(
        group._id.toString(),
      );

      const totalEspees = total?.totalEspees ?? 0;
      const totalNaira = total?.totalNaira ?? 0;

      const classification = rules.find((rule) => {
        const aboveMinimum =
          totalEspees >= rule.minEspees;

        const belowMaximum =
          rule.maxEspees == null ||
          totalEspees <= rule.maxEspees;

        return aboveMinimum && belowMaximum;
      });

      return {
        groupId: group._id.toString(),
        groupName: group.name,
        zone: group.zoneId,
        totalEspees,
        totalNaira,
        contributionCount:
          total?.contributionCount ?? 0,
        classification: classification?.name ?? null,
      };
    });

    standings.sort((a, b) => {
      if (b.totalEspees !== a.totalEspees) {
        return b.totalEspees - a.totalEspees;
      }

      return a.groupName.localeCompare(b.groupName);
    });

    return standings.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
  }
}
