import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISurveyAnswer {
  questionId: string;
  answer: string | string[] | number;
  answeredAt: Date;
}

export interface ISurveySession extends Document {
  user: mongoose.Types.ObjectId;
  survey: mongoose.Types.ObjectId;
  sessionId: string;
  status: 'in_progress' | 'completed' | 'abandoned' | 'expired';
  answers: ISurveyAnswer[];
  currentQuestionIndex: number;
  startedAt: Date;
  completedAt?: Date;
  abandonedAt?: Date;
  timeSpent: number; // in seconds
  coinsEarned: number;
  qualityScore?: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  submitAnswer(questionId: string, answer: any): Promise<ISurveySession>;
  complete(): Promise<ISurveySession>;
  abandon(): Promise<ISurveySession>;
}

export interface ISurveySessionModel extends Model<ISurveySession> {
  getUserStats(userId: string): Promise<{
    totalEarned: number;
    surveysCompleted: number;
    averageTime: number;
    completionRate: number;
  }>;
  getUserHistory(userId: string, limit?: number): Promise<ISurveySession[]>;
  expireSessions(): Promise<any>;
}

const SurveyAnswerSchema = new Schema({
  questionId: {
    type: String,
    required: true
  },
  answer: {
    type: Schema.Types.Mixed,
    required: true
  },
  answeredAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const SurveySessionSchema = new Schema<ISurveySession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    survey: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned', 'expired'],
      default: 'in_progress',
      index: true
    },
    answers: [SurveyAnswerSchema],
    currentQuestionIndex: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    abandonedAt: Date,
    timeSpent: {
      type: Number,
      default: 0
    },
    coinsEarned: {
      type: Number,
      default: 0
    },
    qualityScore: {
      type: Number,
      min: 1,
      max: 10
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
SurveySessionSchema.index({ user: 1, survey: 1 });
SurveySessionSchema.index({ user: 1, status: 1, createdAt: -1 });
SurveySessionSchema.index({ survey: 1, status: 1 });

// Method to submit an answer
SurveySessionSchema.methods.submitAnswer = async function(
  questionId: string,
  answer: any
): Promise<ISurveySession> {
  if (this.status !== 'in_progress') {
    throw new Error('Survey session is not in progress');
  }

  // Check if already answered
  const existingIndex = this.answers.findIndex(
    (a: ISurveyAnswer) => a.questionId === questionId
  );

  if (existingIndex >= 0) {
    // Update existing answer
    this.answers[existingIndex] = {
      questionId,
      answer,
      answeredAt: new Date()
    };
  } else {
    // Add new answer
    this.answers.push({
      questionId,
      answer,
      answeredAt: new Date()
    });
  }

  this.currentQuestionIndex = this.answers.length;

  // Update time spent
  this.timeSpent = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);

  return this.save();
};

// Method to complete the survey
SurveySessionSchema.methods.complete = async function(): Promise<ISurveySession> {
  if (this.status === 'completed') {
    throw new Error('Survey already completed');
  }

  if (this.status === 'expired' || this.status === 'abandoned') {
    throw new Error('Cannot complete this survey session');
  }

  this.status = 'completed';
  this.completedAt = new Date();
  this.timeSpent = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);

  return this.save();
};

// Method to abandon survey
SurveySessionSchema.methods.abandon = async function(): Promise<ISurveySession> {
  if (this.status === 'completed') {
    throw new Error('Cannot abandon completed survey');
  }

  this.status = 'abandoned';
  this.timeSpent = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);

  return this.save();
};

// Static method to get user's survey statistics
SurveySessionSchema.statics.getUserStats = async function(userId: string) {
  const completedSessions = await this.find({
    user: userId,
    status: 'completed'
  });

  const totalSessions = await this.countDocuments({ user: userId });

  const totalEarned = completedSessions.reduce(
    (sum: number, session: ISurveySession) => sum + session.coinsEarned,
    0
  );

  const totalTimeSpent = completedSessions.reduce(
    (sum: number, session: ISurveySession) => sum + session.timeSpent,
    0
  );

  const surveysCompleted = completedSessions.length;
  const averageTime = surveysCompleted > 0
    ? Math.round(totalTimeSpent / surveysCompleted / 60 * 10) / 10 // in minutes
    : 0;
  const completionRate = totalSessions > 0
    ? Math.round((surveysCompleted / totalSessions) * 100)
    : 0;

  return {
    totalEarned,
    surveysCompleted,
    averageTime,
    completionRate
  };
};

// Static method to get user's survey history
SurveySessionSchema.statics.getUserHistory = async function(
  userId: string,
  limit: number = 20
) {
  return this.find({ user: userId, status: 'completed' })
    .populate('survey', 'title category reward.amount estimatedTime')
    .sort({ completedAt: -1 })
    .limit(limit);
};

// Static method to expire old sessions
SurveySessionSchema.statics.expireSessions = async function() {
  const now = new Date();

  return this.updateMany(
    {
      status: 'in_progress',
      expiresAt: { $lt: now }
    },
    {
      status: 'expired'
    }
  );
};

export const SurveySession = mongoose.model<ISurveySession, ISurveySessionModel>(
  'SurveySession',
  SurveySessionSchema
);
