import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Quiz Question Interface
 *
 * Represents a quiz question that users can answer to earn coins
 * Used in the quiz game feature for user engagement and gamification
 */
export interface IQuizQuestion extends Document {
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct answer in options array (0-based)
  category: 'general' | 'shopping' | 'fashion' | 'food' | 'technology' | 'entertainment' | 'sports' | 'lifestyle';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  explanation?: string; // Optional explanation shown after answering
  imageUrl?: string; // Optional image for visual questions
  tags?: string[];
  isActive: boolean;
  usageCount: number; // Track how many times this question has been used
  correctAnswerCount: number; // Track correct answers
  incorrectAnswerCount: number; // Track incorrect answers
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for static methods
 */
export interface IQuizQuestionModel extends Model<IQuizQuestion> {
  getRandomQuestions(
    count: number,
    category?: string,
    difficulty?: string
  ): Promise<IQuizQuestion[]>;
  getQuestionsByDifficulty(difficulty: string, limit?: number): Promise<IQuizQuestion[]>;
  getQuestionsByCategory(category: string, limit?: number): Promise<IQuizQuestion[]>;
  updateQuestionStats(questionId: string, isCorrect: boolean): Promise<void>;
  getQuestionAccuracyRate(questionId: string): Promise<number>;
}

const QuizQuestionSchema: Schema = new Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function(options: string[]) {
          return options.length >= 2 && options.length <= 6;
        },
        message: 'Quiz must have between 2 and 6 options'
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function(this: IQuizQuestion, answer: number) {
          return answer < this.options.length;
        },
        message: 'Correct answer index must be within options array bounds'
      }
    },
    category: {
      type: String,
      enum: ['general', 'shopping', 'fashion', 'food', 'technology', 'entertainment', 'sports', 'lifestyle'],
      required: true,
      index: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
      index: true
    },
    points: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      default: function(this: IQuizQuestion) {
        // Auto-assign points based on difficulty if not provided
        const pointsMap: Record<string, number> = {
          easy: 10,
          medium: 20,
          hard: 30
        };
        return pointsMap[this.difficulty] || 10;
      }
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: 500
    },
    imageUrl: {
      type: String,
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    correctAnswerCount: {
      type: Number,
      default: 0,
      min: 0
    },
    incorrectAnswerCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient querying
QuizQuestionSchema.index({ category: 1, difficulty: 1, isActive: 1 });
QuizQuestionSchema.index({ difficulty: 1, isActive: 1, usageCount: 1 });
QuizQuestionSchema.index({ tags: 1, isActive: 1 });

// Virtual for accuracy rate
QuizQuestionSchema.virtual('accuracyRate').get(function(this: IQuizQuestion) {
  const totalAnswers = this.correctAnswerCount + this.incorrectAnswerCount;
  if (totalAnswers === 0) return 0;
  return (this.correctAnswerCount / totalAnswers) * 100;
});

/**
 * Get random questions for quiz
 * @param count Number of questions to retrieve
 * @param category Optional category filter
 * @param difficulty Optional difficulty filter
 */
QuizQuestionSchema.statics.getRandomQuestions = async function(
  count: number = 10,
  category?: string,
  difficulty?: string
): Promise<IQuizQuestion[]> {
  const query: any = { isActive: true };

  if (category) {
    query.category = category;
  }

  if (difficulty) {
    query.difficulty = difficulty;
  }

  // Use MongoDB aggregation for random selection with better distribution
  const questions = await this.aggregate([
    { $match: query },
    { $sample: { size: count } }
  ]);

  return questions;
};

/**
 * Get questions by difficulty level
 */
QuizQuestionSchema.statics.getQuestionsByDifficulty = async function(
  difficulty: string,
  limit: number = 10
): Promise<IQuizQuestion[]> {
  return this.find({ difficulty, isActive: true })
    .limit(limit)
    .sort({ usageCount: 1 }) // Prefer less-used questions
    .exec();
};

/**
 * Get questions by category
 */
QuizQuestionSchema.statics.getQuestionsByCategory = async function(
  category: string,
  limit: number = 10
): Promise<IQuizQuestion[]> {
  return this.find({ category, isActive: true })
    .limit(limit)
    .sort({ usageCount: 1 }) // Prefer less-used questions
    .exec();
};

/**
 * Update question statistics after being answered
 */
QuizQuestionSchema.statics.updateQuestionStats = async function(
  questionId: string,
  isCorrect: boolean
): Promise<void> {
  const updateField = isCorrect ? 'correctAnswerCount' : 'incorrectAnswerCount';

  await this.findByIdAndUpdate(
    questionId,
    {
      $inc: {
        usageCount: 1,
        [updateField]: 1
      }
    }
  );
};

/**
 * Get accuracy rate for a specific question
 */
QuizQuestionSchema.statics.getQuestionAccuracyRate = async function(
  questionId: string
): Promise<number> {
  const question = await this.findById(questionId).select('correctAnswerCount incorrectAnswerCount');

  if (!question) {
    throw new Error('Question not found');
  }

  const totalAnswers = question.correctAnswerCount + question.incorrectAnswerCount;
  if (totalAnswers === 0) return 0;

  return (question.correctAnswerCount / totalAnswers) * 100;
};

/**
 * Pre-save middleware to validate correctAnswer
 */
QuizQuestionSchema.pre('save', function(this: IQuizQuestion, next) {
  if (this.correctAnswer >= this.options.length) {
    next(new Error('Correct answer index must be within options array bounds'));
  } else {
    next();
  }
});

export const QuizQuestion = mongoose.model<IQuizQuestion, IQuizQuestionModel>(
  'QuizQuestion',
  QuizQuestionSchema
);

export default QuizQuestion;
