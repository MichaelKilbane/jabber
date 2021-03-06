import { NextFunction, Request, Response } from 'express';
import StatsService from '@/services/stats.service';
import { GetStatsResponse } from '@interfaces/stats.interface';

class StatsController {
  public statsService = new StatsService();

  public getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const statsData: GetStatsResponse = await this.statsService.getStatsAccurate();

      res.status(200).json({ data: statsData, message: 'getStats' });
    } catch (error) {
      next(error);
    }
  };
}

export default StatsController;
