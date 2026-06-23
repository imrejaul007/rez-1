import mongoose, { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Project, IProject, ISurveyQuestion } from '../models/Project';
import { SurveySession, ISurveySession } from '../models/SurveySession';
import { awardCoins } from './coinService';

export interface SurveyFilters {
  category?: string;
  status?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

export interface SurveyListItem {
  _id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  subcategory?: string;
  reward: number;
  estimatedTime: number;
  questionsCount: number;
  status: string;
  sponsor?: {
    name: string;
    logo: string;
  };
  expiresAt?: Date;
  completedCount: number;
  targetResponses: number;
  isFeatured: boolean;
  difficulty: string;
}

export interface CategoryCount {
  name: string;
  count: number;
}

/**
 * Get all active surveys with optional filters
 */
export async function getSurveys(filters: SurveyFilters = {}): Promise<SurveyListItem[]> {
  const { category, status = 'active', featured, limit = 50, offset = 0 } = filters;

  const query: any = {
    category: 'survey',
    type: 'survey',
    status
  };

  // Filter by subcategory if provided
  if (category && category !== 'All') {
    query.subcategory = category;
  }

  if (featured !== undefined) {
    query.isFeatured = featured;
  }

  // Ensure survey has valid expiry date or no expiry
  query.$and = [
    {
      $or: [
        { 'limits.expiryDate': { $exists: false } },
        { 'limits.expiryDate': null },
        { 'limits.expiryDate': { $gte: new Date() } }
      ]
    }
  ];

  const surveys = await Project.find(query)
    .populate('sponsor', 'name logo')
    .sort({ isFeatured: -1, createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  return surveys.map(survey => ({
    _id: survey._id.toString(),
    title: survey.title,
    description: survey.description,
    shortDescription: survey.shortDescription,
    category: survey.category,
    subcategory: survey.subcategory,
    reward: survey.reward?.amount || 0,
    estimatedTime: survey.estimatedTime || survey.surveyConfig?.estimatedTime || 5,
    questionsCount: survey.surveyConfig?.questions?.length || 0,
    status: survey.status,
    sponsor: survey.sponsor ? {
      name: (survey.sponsor as any).name,
      logo: (survey.sponsor as any).logo
    } : undefined,
    expiresAt: survey.limits?.expiryDate,
    completedCount: survey.analytics?.approvedSubmissions || 0,
    targetResponses: survey.surveyConfig?.targetResponses || survey.limits?.maxCompletions || 1000,
    isFeatured: survey.isFeatured,
    difficulty: survey.difficulty
  }));
}

/**
 * Get survey by ID with full details including questions
 */
export async function getSurveyById(surveyId: string, userId?: string): Promise<any> {
  const survey = await Project.findOne({
    _id: surveyId,
    category: 'survey',
    type: 'survey'
  })
    .populate('sponsor', 'name logo')
    .lean();

  if (!survey) {
    throw new Error('Survey not found');
  }

  let userStatus = 'not_started';
  let existingSession = null;

  if (userId) {
    // Check if user has completed this survey
    const completedSession = await SurveySession.findOne({
      user: userId,
      survey: surveyId,
      status: 'completed'
    }).lean();

    if (completedSession) {
      userStatus = 'completed';
    } else {
      // Check for in-progress session
      const inProgressSession = await SurveySession.findOne({
        user: userId,
        survey: surveyId,
        status: 'in_progress'
      }).lean();

      if (inProgressSession) {
        userStatus = 'in_progress';
        existingSession = {
          sessionId: (inProgressSession._id as any).toString(),
          currentQuestionIndex: inProgressSession.currentQuestionIndex,
          answeredCount: inProgressSession.answers.length
        };
      }
    }
  }

  return {
    _id: survey._id.toString(),
    title: survey.title,
    description: survey.description,
    shortDescription: survey.shortDescription,
    category: survey.category,
    subcategory: survey.subcategory,
    reward: survey.reward?.amount || 0,
    estimatedTime: survey.estimatedTime || survey.surveyConfig?.estimatedTime || 5,
    questions: survey.surveyConfig?.questions || [],
    questionsCount: survey.surveyConfig?.questions?.length || 0,
    status: survey.status,
    sponsor: survey.sponsor ? {
      name: (survey.sponsor as any).name,
      logo: (survey.sponsor as any).logo
    } : undefined,
    expiresAt: survey.limits?.expiryDate,
    completedCount: survey.analytics?.approvedSubmissions || 0,
    targetResponses: survey.surveyConfig?.targetResponses || survey.limits?.maxCompletions || 1000,
    isFeatured: survey.isFeatured,
    difficulty: survey.difficulty,
    instructions: survey.instructions,
    userStatus,
    existingSession,
    allowSkip: survey.surveyConfig?.allowSkip || false,
    randomizeQuestions: survey.surveyConfig?.randomizeQuestions || false,
    showProgress: survey.surveyConfig?.showProgress !== false
  };
}

/**
 * Get survey categories with counts
 */
export async function getSurveyCategories(): Promise<CategoryCount[]> {
  const categories = await Project.aggregate([
    {
      $match: {
        category: 'survey',
        type: 'survey',
        status: 'active'
      }
    },
    {
      $group: {
        _id: '$subcategory',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  // Add "All" category at the beginning
  const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);

  return [
    { name: 'All', count: totalCount },
    ...categories.map(cat => ({
      name: cat._id || 'General',
      count: cat.count
    }))
  ];
}

/**
 * Start a new survey session
 */
export async function startSurvey(userId: string, surveyId: string): Promise<any> {
  // Check if survey exists and is active
  const survey = await Project.findOne({
    _id: surveyId,
    category: 'survey',
    type: 'survey',
    status: 'active'
  }).lean();

  if (!survey) {
    throw new Error('Survey not found or not active');
  }

  // Check if user has already completed this survey
  const completedSession = await SurveySession.findOne({
    user: userId,
    survey: surveyId,
    status: 'completed'
  }).lean();

  if (completedSession) {
    throw new Error('You have already completed this survey');
  }

  // Check for existing in-progress session
  let session = await SurveySession.findOne({
    user: userId,
    survey: surveyId,
    status: 'in_progress'
  }).lean();

  if (session) {
    // Return existing session
    return {
      sessionId: (session._id as any).toString(),
      currentQuestionIndex: session.currentQuestionIndex,
      answers: session.answers,
      resumed: true
    };
  }

  // Create new session (expires in 24 hours)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  session = new SurveySession({
    user: userId,
    survey: surveyId,
    sessionId: uuidv4(),
    status: 'in_progress',
    answers: [],
    currentQuestionIndex: 0,
    startedAt: new Date(),
    expiresAt
  }) as any;

  await (session as any).save();

  // Update survey analytics
  await Project.findByIdAndUpdate(surveyId, {
    $inc: { 'analytics.totalApplications': 1 }
  });

  return {
    sessionId: (session!._id as any).toString(),
    currentQuestionIndex: 0,
    answers: [],
    resumed: false
  };
}

/**
 * Submit survey answers and complete
 */
export async function submitSurvey(
  userId: string,
  surveyId: string,
  answers: { questionId: string; answer: any }[]
): Promise<any> {
  // Find the survey
  const survey = await Project.findOne({
    _id: surveyId,
    category: 'survey',
    type: 'survey'
  }).lean();

  if (!survey) {
    throw new Error('Survey not found');
  }

  // Find or create session
  let session = await SurveySession.findOne({
    user: userId,
    survey: surveyId,
    status: 'in_progress'
  }).lean();

  if (!session) {
    // Check if already completed
    const completedSession = await SurveySession.findOne({
      user: userId,
      survey: surveyId,
      status: 'completed'
    }).lean();

    if (completedSession) {
      throw new Error('You have already completed this survey');
    }

    // Create session for direct submission
    const directExpiresAt = new Date();
    directExpiresAt.setHours(directExpiresAt.getHours() + 24);

    session = new SurveySession({
      user: userId,
      survey: surveyId,
      sessionId: uuidv4(),
      status: 'in_progress',
      answers: [],
      startedAt: new Date(),
      expiresAt: directExpiresAt
    }) as any;
  }

  // Update answers
  session!.answers = answers.map(a => ({
    questionId: a.questionId,
    answer: a.answer,
    answeredAt: new Date()
  }));

  // Calculate quality score based on answers
  const questionsCount = survey.surveyConfig?.questions?.length || 0;
  const answeredCount = answers.length;
  const qualityScore = questionsCount > 0 ? Math.round((answeredCount / questionsCount) * 10) : 10;

  // Complete the session
  session!.status = 'completed' as any;
  session!.completedAt = new Date();
  session!.timeSpent = Math.floor((session!.completedAt.getTime() - session!.startedAt.getTime()) / 1000);
  session!.qualityScore = qualityScore;
  session!.coinsEarned = survey.reward?.amount || 0;

  await (session as any).save();

  // Award coins to user
  const coinsEarned = survey.reward?.amount || 0;
  if (coinsEarned > 0) {
    await awardCoins(
      userId,
      coinsEarned,
      'survey',
      `Completed survey: ${survey.title}`,
      {
        surveyId: survey._id,
        surveyTitle: survey.title,
        sessionId: session!._id
      }
    );
  }

  // Update survey analytics
  await Project.findByIdAndUpdate(surveyId, {
    $inc: {
      'analytics.totalSubmissions': 1,
      'analytics.approvedSubmissions': 1,
      'analytics.totalPayout': coinsEarned
    }
  });

  return {
    sessionId: (session!._id as any).toString(),
    coinsEarned,
    timeSpent: session!.timeSpent,
    qualityScore,
    completedAt: session!.completedAt
  };
}

/**
 * Get user's survey statistics
 */
export async function getUserSurveyStats(userId: string): Promise<any> {
  const stats = await (SurveySession as any).getUserStats(new Types.ObjectId(userId));

  // Calculate streak (consecutive days with completed surveys)
  const recentSessions = await SurveySession.find({
    user: userId,
    status: 'completed'
  })
    .sort({ completedAt: -1 })
    .limit(30)
    .lean();

  let streak = 0;
  if (recentSessions.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentDate = new Date(today);
    for (const session of recentSessions) {
      const sessionDate = new Date(session.completedAt!);
      sessionDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 0 || dayDiff === 1) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }
  }

  return {
    ...stats,
    streak
  };
}

/**
 * Get user's survey history
 */
export async function getUserSurveyHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<any> {
  const sessions = await SurveySession.find({
    user: userId,
    status: 'completed'
  })
    .populate('survey', 'title description category subcategory reward estimatedTime')
    .sort({ completedAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  const total = await SurveySession.countDocuments({
    user: userId,
    status: 'completed'
  });

  return {
    surveys: sessions.map(session => ({
      sessionId: session._id.toString(),
      survey: session.survey ? {
        _id: (session.survey as any)._id.toString(),
        title: (session.survey as any).title,
        description: (session.survey as any).description,
        category: (session.survey as any).category,
        subcategory: (session.survey as any).subcategory,
        reward: (session.survey as any).reward?.amount || 0
      } : null,
      coinsEarned: session.coinsEarned,
      timeSpent: session.timeSpent,
      completedAt: session.completedAt
    })),
    total,
    hasMore: offset + sessions.length < total
  };
}

/**
 * Save progress (partial submission)
 */
export async function saveProgress(
  userId: string,
  surveyId: string,
  answers: { questionId: string; answer: any }[],
  currentQuestionIndex: number
): Promise<any> {
  let session = await SurveySession.findOne({
    user: userId,
    survey: surveyId,
    status: 'in_progress'
  });

  if (!session) {
    throw new Error('No active session found');
  }

  // Update answers and progress
  session.answers = answers.map(a => ({
    questionId: a.questionId,
    answer: a.answer,
    answeredAt: new Date()
  }));
  session.currentQuestionIndex = currentQuestionIndex;

  await session.save();

  return {
    sessionId: (session._id as any).toString(),
    savedAnswers: session.answers.length,
    currentQuestionIndex: session.currentQuestionIndex
  };
}

/**
 * Abandon a survey session
 */
export async function abandonSurvey(userId: string, surveyId: string): Promise<void> {
  const session = await SurveySession.findOne({
    user: userId,
    survey: surveyId,
    status: 'in_progress'
  });

  if (session) {
    session.status = 'abandoned';
    session.abandonedAt = new Date();
    session.timeSpent = Math.floor((session.abandonedAt.getTime() - session.startedAt.getTime()) / 1000);
    await session.save();
  }
}

export default {
  getSurveys,
  getSurveyById,
  getSurveyCategories,
  startSurvey,
  submitSurvey,
  getUserSurveyStats,
  getUserSurveyHistory,
  saveProgress,
  abandonSurvey
};
