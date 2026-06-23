import { Request, Response } from 'express';
import surveyService from '../services/surveyService';
import { asyncHandler } from '../utils/asyncHandler';

class SurveyController {
  // GET /api/surveys
  getSurveys = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { category, status, featured, limit, offset } = req.query;

      const surveys = await surveyService.getSurveys({
        category: category as string | undefined,
        status: status as string | undefined,
        featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });

      res.json({
        success: true,
        data: surveys
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/surveys/categories
  getCategories = asyncHandler(async (req: Request, res: Response) => {
    try {
      const categories = await surveyService.getSurveyCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/surveys/stats
  getUserStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const stats = await surveyService.getUserSurveyStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/surveys/history
  getUserHistory = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { limit, offset } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const history = await surveyService.getUserSurveyHistory(
        userId,
        limit ? parseInt(limit as string) : 50,
        offset ? parseInt(offset as string) : 0
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/surveys/:id
  getSurveyById = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const survey = await surveyService.getSurveyById(id, userId);

      res.json({
        success: true,
        data: survey
      });
    } catch (error: any) {
      res.status(error.message === 'Survey not found' ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/surveys/:id/start
  startSurvey = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const session = await surveyService.startSurvey(userId, id);

      res.json({
        success: true,
        data: session,
        message: session.resumed ? 'Resumed existing session' : 'Survey started successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/surveys/:id/submit
  submitSurvey = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { answers } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          message: 'Answers are required and must be an array'
        });
      }

      const result = await surveyService.submitSurvey(userId, id, answers);

      res.json({
        success: true,
        data: result,
        message: 'Survey completed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/surveys/:id/save-progress
  saveProgress = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { answers, currentQuestionIndex } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = await surveyService.saveProgress(
        userId,
        id,
        answers || [],
        currentQuestionIndex || 0
      );

      res.json({
        success: true,
        data: result,
        message: 'Progress saved'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/surveys/:id/abandon
  abandonSurvey = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      await surveyService.abandonSurvey(userId, id);

      res.json({
        success: true,
        message: 'Survey abandoned'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
}

export default new SurveyController();
