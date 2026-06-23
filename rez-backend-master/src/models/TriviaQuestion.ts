import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Trivia Question Interface
 *
 * Represents daily trivia questions for user engagement
 * Trivia differs from quiz in that it's more fact-based, often with interesting information
 * Used for daily challenges and casual knowledge sharing
 */
export interface ITriviaQuestion extends Document {
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct answer in options array (0-based)
  category: 'history' | 'science' | 'geography' | 'pop_culture' | 'movies' | 'music' | 'art' | 'literature' | 'nature' | 'random';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  funFact?: string; // Interesting fact related to the question/answer
  imageUrl?: string;
  sourceUrl?: string; // Source of the trivia fact for verification
  tags?: string[];
  dateOfDay?: Date; // If used as daily trivia
  isActive: boolean;
  usageCount: number;
  correctAnswerCount: number;
  incorrectAnswerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for static methods
 */
export interface ITriviaQuestionModel extends Model<ITriviaQuestion> {
  getDailyTrivia(date?: Date): Promise<ITriviaQuestion>;
  getRandomTrivia(count?: number, category?: string): Promise<ITriviaQuestion[]>;
  getTriviaByCategory(category: string, limit?: number): Promise<ITriviaQuestion[]>;
  updateTriviaStats(triviaId: string, isCorrect: boolean): Promise<void>;
  assignDailyTrivia(date: Date): Promise<ITriviaQuestion>;
}

const TriviaQuestionSchema: Schema = new Schema(
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
        message: 'Trivia must have between 2 and 6 options'
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function(this: ITriviaQuestion, answer: number) {
          return answer < this.options.length;
        },
        message: 'Correct answer index must be within options array bounds'
      }
    },
    category: {
      type: String,
      enum: ['history', 'science', 'geography', 'pop_culture', 'movies', 'music', 'art', 'literature', 'nature', 'random'],
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
      min: 5,
      max: 50,
      default: function(this: ITriviaQuestion) {
        // Auto-assign points based on difficulty
        const pointsMap: Record<string, number> = {
          easy: 15,
          medium: 25,
          hard: 35
        };
        return pointsMap[this.difficulty] || 15;
      }
    },
    funFact: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    imageUrl: {
      type: String,
      trim: true
    },
    sourceUrl: {
      type: String,
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    dateOfDay: {
      type: Date
      // Index defined separately below to handle null values properly
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
TriviaQuestionSchema.index({ category: 1, difficulty: 1, isActive: 1 });
// Unique index only for assigned daily trivia (dateOfDay not null)
// Note: sparse index allows multiple null values while maintaining uniqueness for non-null values
TriviaQuestionSchema.index({ dateOfDay: 1 }, { unique: true, sparse: true });
TriviaQuestionSchema.index({ isActive: 1, usageCount: 1 });

// Virtual for accuracy rate
TriviaQuestionSchema.virtual('accuracyRate').get(function(this: ITriviaQuestion) {
  const totalAnswers = this.correctAnswerCount + this.incorrectAnswerCount;
  if (totalAnswers === 0) return 0;
  return (this.correctAnswerCount / totalAnswers) * 100;
});

/**
 * Get daily trivia for a specific date
 */
TriviaQuestionSchema.statics.getDailyTrivia = async function(date?: Date): Promise<ITriviaQuestion> {
  const queryDate = date || new Date();
  // Normalize to start of day
  queryDate.setHours(0, 0, 0, 0);

  let dailyTrivia = await this.findOne({
    dateOfDay: queryDate,
    isActive: true
  });

  // If no trivia assigned for this day, assign one
  if (!dailyTrivia) {
    dailyTrivia = await (this as unknown as ITriviaQuestionModel).assignDailyTrivia(queryDate);
  }

  return dailyTrivia;
};

/**
 * Get random trivia questions
 */
TriviaQuestionSchema.statics.getRandomTrivia = async function(
  count: number = 5,
  category?: string
): Promise<ITriviaQuestion[]> {
  const query: any = { isActive: true, dateOfDay: null }; // Exclude daily trivia

  if (category) {
    query.category = category;
  }

  const trivia = await this.aggregate([
    { $match: query },
    { $sample: { size: count } }
  ]);

  return trivia;
};

/**
 * Get trivia by category
 */
TriviaQuestionSchema.statics.getTriviaByCategory = async function(
  category: string,
  limit: number = 10
): Promise<ITriviaQuestion[]> {
  return this.find({ category, isActive: true, dateOfDay: null })
    .limit(limit)
    .sort({ usageCount: 1 }) // Prefer less-used questions
    .exec();
};

/**
 * Update trivia statistics
 */
TriviaQuestionSchema.statics.updateTriviaStats = async function(
  triviaId: string,
  isCorrect: boolean
): Promise<void> {
  const updateField = isCorrect ? 'correctAnswerCount' : 'incorrectAnswerCount';

  await this.findByIdAndUpdate(
    triviaId,
    {
      $inc: {
        usageCount: 1,
        [updateField]: 1
      }
    }
  );
};

/**
 * Assign a trivia question to a specific date
 */
TriviaQuestionSchema.statics.assignDailyTrivia = async function(date: Date): Promise<ITriviaQuestion> {
  // Normalize date to start of day
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  // Find a question that hasn't been used as daily trivia yet
  const unusedTrivia = await this.findOne({
    dateOfDay: null,
    isActive: true
  }).sort({ usageCount: 1 }); // Pick least used

  if (!unusedTrivia) {
    throw new Error('No available trivia questions for daily assignment');
  }

  // Assign the date
  unusedTrivia.dateOfDay = normalizedDate;
  await unusedTrivia.save();

  return unusedTrivia;
};

/**
 * Pre-save middleware for validation
 */
TriviaQuestionSchema.pre('save', function(this: ITriviaQuestion, next) {
  if (this.correctAnswer >= this.options.length) {
    next(new Error('Correct answer index must be within options array bounds'));
  } else {
    next();
  }
});

export const TriviaQuestion = mongoose.model<ITriviaQuestion, ITriviaQuestionModel>(
  'TriviaQuestion',
  TriviaQuestionSchema
);

export default TriviaQuestion;
