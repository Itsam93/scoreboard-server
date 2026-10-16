
import { Router } from "express";

import { LeagueService } from "../services/league.service";

const router = Router();
const leagueService = new LeagueService();

router.get("/standings", async (_req, res) => {
  const standings = await leagueService.getStandings();

  res.json({
    success: true,
    count: standings.length,
    data: standings,
  });
});

export default router;
