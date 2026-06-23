import { logger } from '../config/logger';
import { MiniGame } from '../models/MiniGame';
import { CoinTransaction } from '../models/CoinTransaction';
import mongoose from 'mongoose';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  coins: number;
  category: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  // Easy Questions (20 coins each)
  {
    id: 'q1',
    question: 'What is the capital of India?',
    options: ['Mumbai', 'Delhi', 'Kolkata', 'Chennai'],
    correctAnswer: 1,
    difficulty: 'easy',
    coins: 20,
    category: 'Geography'
  },
  {
    id: 'q2',
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctAnswer: 1,
    difficulty: 'easy',
    coins: 20,
    category: 'Science'
  },
  {
    id: 'q3',
    question: 'How many days are there in a leap year?',
    options: ['365', '366', '364', '367'],
    correctAnswer: 1,
    difficulty: 'easy',
    coins: 20,
    category: 'General Knowledge'
  },
  {
    id: 'q4',
    question: 'What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'],
    correctAnswer: 2,
    difficulty: 'easy',
    coins: 20,
    category: 'Geography'
  },
  {
    id: 'q5',
    question: 'What is the currency of Japan?',
    options: ['Yuan', 'Won', 'Yen', 'Ringgit'],
    correctAnswer: 2,
    difficulty: 'easy',
    coins: 20,
    category: 'General Knowledge'
  },

  // Medium Questions (50 coins each)
  {
    id: 'q6',
    question: 'Who wrote the Mahabharata?',
    options: ['Valmiki', 'Tulsidas', 'Vyasa', 'Kalidasa'],
    correctAnswer: 2,
    difficulty: 'medium',
    coins: 50,
    category: 'Literature'
  },
  {
    id: 'q7',
    question: 'In which year did India gain independence?',
    options: ['1945', '1946', '1947', '1948'],
    correctAnswer: 2,
    difficulty: 'medium',
    coins: 50,
    category: 'History'
  },
  {
    id: 'q8',
    question: 'What is the chemical symbol for Gold?',
    options: ['Go', 'Au', 'Gd', 'Ag'],
    correctAnswer: 1,
    difficulty: 'medium',
    coins: 50,
    category: 'Science'
  },
  {
    id: 'q9',
    question: 'Which is the longest river in the world?',
    options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'],
    correctAnswer: 1,
    difficulty: 'medium',
    coins: 50,
    category: 'Geography'
  },
  {
    id: 'q10',
    question: 'Who invented the telephone?',
    options: ['Thomas Edison', 'Alexander Graham Bell', 'Nikola Tesla', 'Guglielmo Marconi'],
    correctAnswer: 1,
    difficulty: 'medium',
    coins: 50,
    category: 'History'
  },

  // Hard Questions (100 coins each)
  {
    id: 'q11',
    question: 'What is the speed of light in vacuum (km/s)?',
    options: ['300,000', '150,000', '450,000', '600,000'],
    correctAnswer: 0,
    difficulty: 'hard',
    coins: 100,
    category: 'Science'
  },
  {
    id: 'q12',
    question: 'Which Mughal emperor built the Taj Mahal?',
    options: ['Akbar', 'Jahangir', 'Shah Jahan', 'Aurangzeb'],
    correctAnswer: 2,
    difficulty: 'hard',
    coins: 100,
    category: 'History'
  },
  {
    id: 'q13',
    question: 'What is the smallest country in the world?',
    options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'],
    correctAnswer: 1,
    difficulty: 'hard',
    coins: 100,
    category: 'Geography'
  },
  {
    id: 'q14',
    question: 'Who is known as the "Father of Computers"?',
    options: ['Charles Babbage', 'Alan Turing', 'John von Neumann', 'Steve Jobs'],
    correctAnswer: 0,
    difficulty: 'hard',
    coins: 100,
    category: 'Technology'
  },
  {
    id: 'q15',
    question: 'What is the chemical formula for water?',
    options: ['H2O', 'CO2', 'O2', 'H2O2'],
    correctAnswer: 0,
    difficulty: 'hard',
    coins: 100,
    category: 'Science'
  }
];

/**
 * Start a new quiz session
 */
export async function startQuiz(
  userId: string,
  difficulty: 'easy' | 'medium' | 'hard',
  questionCount: number = 5
): Promise<{
  quizId: string;
  questions: Array<Omit<QuizQuestion, 'correctAnswer' | 'coins'>>;
  timeLimit: number;
  totalQuestions: number;
}> {
  // Expire old active quizzes
  await MiniGame.updateMany(
    {
      user: userId,
      gameType: 'quiz',
      status: 'active'
    },
    {
      status: 'expired'
    }
  );

  // Select random questions of the specified difficulty
  const availableQuestions = QUIZ_QUESTIONS.filter(q => q.difficulty === difficulty);
  const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffled.slice(0, Math.min(questionCount, availableQuestions.length));

  if (selectedQuestions.length === 0) {
    throw new Error('No questions available for this difficulty');
  }

  // Create quiz session (expires in 30 minutes)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const quiz = await MiniGame.create({
    user: userId,
    gameType: 'quiz',
    status: 'active',
    difficulty,
    expiresAt,
    metadata: {
      questions: selectedQuestions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        coins: q.coins,
        category: q.category
      })),
      currentQuestion: 0,
      score: 0,
      correctAnswers: 0,
      totalQuestions: selectedQuestions.length,
      answers: []
    }
  });

  return {
    quizId: (quiz._id as mongoose.Types.ObjectId).toString(),
    questions: selectedQuestions.map(({ correctAnswer, coins, ...q }) => q),
    timeLimit: 30, // 30 seconds per question
    totalQuestions: selectedQuestions.length
  };
}

/**
 * Submit answer for a quiz question
 */
export async function submitAnswer(
  quizId: string,
  questionIndex: number,
  answer: number,
  timeSpent: number
): Promise<{
  correct: boolean;
  coinsEarned: number;
  currentScore: number;
  correctAnswer: number;
  explanation?: string;
  completed: boolean;
}> {
  const quiz = await MiniGame.findById(quizId);

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  if (quiz.status === 'completed') {
    throw new Error('Quiz already completed');
  }

  if (quiz.status === 'expired') {
    throw new Error('Quiz has expired');
  }

  if (new Date() > quiz.expiresAt) {
    quiz.status = 'expired';
    await quiz.save();
    throw new Error('Quiz has expired');
  }

  // Input validation — prevent exploits
  if (questionIndex < 0 || questionIndex >= (quiz.metadata?.totalQuestions || 0)) {
    throw new Error('Invalid question index: out of bounds');
  }
  if (answer < 0 || answer > 3) {
    throw new Error('Invalid answer: must be 0-3');
  }
  if (timeSpent !== undefined && timeSpent !== null) {
    if (timeSpent < 0) {
      throw new Error('Invalid time spent: cannot be negative');
    }
    // Minimum 2 seconds per question to prevent bot submissions
    if (timeSpent < 2000 && timeSpent > 0) {
      logger.warn(`⚠️ [QUIZ] Suspicious fast answer: ${timeSpent}ms for question ${questionIndex} in quiz ${quizId}`);
    }
  }
  // Prevent answering the same question twice
  const existingAnswers = quiz.metadata?.answers || [];
  if (existingAnswers.some((a: any) => a.questionIndex === questionIndex)) {
    throw new Error('Question already answered');
  }

  const questions = quiz.metadata?.questions || [];
  const question = questions[questionIndex];

  if (!question) {
    throw new Error('Invalid question index');
  }

  const correct = answer === question.correctAnswer;
  const coinsEarned = correct ? question.coins : 0;

  // Update quiz metadata
  const answers = quiz.metadata?.answers || [];
  answers.push({
    questionIndex,
    answer,
    correct,
    coinsEarned,
    timeSpent
  });

  quiz.metadata = {
    ...quiz.metadata,
    answers,
    score: (quiz.metadata?.score ?? 0) + coinsEarned,
    correctAnswers: (quiz.metadata?.correctAnswers ?? 0) + (correct ? 1 : 0),
    currentQuestion: questionIndex + 1
  };

  // Check if quiz is complete
  const completed = (quiz.metadata.currentQuestion ?? 0) >= (quiz.metadata.totalQuestions ?? 0);

  if (completed) {
    quiz.status = 'completed';
    quiz.completedAt = new Date();
    quiz.reward = { coins: quiz.metadata.score ?? 0 };

    // Award coins via rewardEngine (unified: wallet + CoinTransaction + ledger)
    if ((quiz.metadata.score ?? 0) > 0) {
      const { rewardEngine } = await import('../core/rewardEngine');
      await rewardEngine.issue({
        userId: quiz.user.toString(),
        amount: quiz.metadata.score ?? 0,
        rewardType: 'quiz_game',
        source: 'quiz_game',
        description: `Earned ${quiz.metadata.score ?? 0} coins from Quiz (${quiz.difficulty ?? 'easy'})`,
        operationType: 'game_prize',
        referenceId: `quiz:${quiz._id}:answer`,
        referenceModel: 'MiniGame',
        metadata: { quizId: quiz._id },
      });
    }
  }

  await quiz.save();

  return {
    correct,
    coinsEarned,
    currentScore: quiz.metadata.score ?? 0,
    correctAnswer: question.correctAnswer,
    completed
  };
}

/**
 * Get quiz progress
 */
export async function getQuizProgress(quizId: string): Promise<any> {
  const quiz = await MiniGame.findById(quizId).lean();

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  return {
    quizId: quiz._id,
    status: quiz.status,
    difficulty: quiz.difficulty,
    currentQuestion: quiz.metadata?.currentQuestion || 0,
    totalQuestions: quiz.metadata?.totalQuestions || 0,
    score: quiz.metadata?.score || 0,
    correctAnswers: quiz.metadata?.correctAnswers || 0,
    answers: quiz.metadata?.answers || [],
    completedAt: quiz.completedAt,
    expiresAt: quiz.expiresAt
  };
}

/**
 * Complete quiz (submit all answers)
 */
export async function completeQuiz(quizId: string): Promise<any> {
  const quiz = await MiniGame.findById(quizId);

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  if (quiz.status === 'completed') {
    return getQuizProgress(quizId);
  }

  // Force complete the quiz
  quiz.status = 'completed';
  quiz.completedAt = new Date();
  quiz.reward = { coins: quiz.metadata?.score || 0 };

  // Award coins via rewardEngine (unified: wallet + CoinTransaction + ledger)
  if (quiz.metadata?.score && quiz.metadata.score > 0) {
    const { rewardEngine } = await import('../core/rewardEngine');
    await rewardEngine.issue({
      userId: quiz.user.toString(),
      amount: quiz.metadata.score,
      rewardType: 'quiz_game',
      source: 'quiz_game',
      description: `Earned ${quiz.metadata.score} coins from Quiz (${quiz.difficulty})`,
      operationType: 'game_prize',
      referenceId: `quiz:${quiz._id}:complete`,
      referenceModel: 'MiniGame',
      metadata: { quizId: quiz._id },
    });
  }

  await quiz.save();

  return getQuizProgress(quizId);
}

/**
 * Get quiz statistics for user
 */
export async function getQuizStats(userId: string): Promise<any> {
  const quizzes = await MiniGame.find({
    user: userId,
    gameType: 'quiz',
    status: 'completed'
  }).lean();

  const totalQuizzes = quizzes.length;
  let totalCoinsEarned = 0;
  let totalQuestionsAnswered = 0;
  let totalCorrectAnswers = 0;

  const difficultyStats = {
    easy: { played: 0, coins: 0, accuracy: 0 },
    medium: { played: 0, coins: 0, accuracy: 0 },
    hard: { played: 0, coins: 0, accuracy: 0 }
  };

  quizzes.forEach(quiz => {
    const coins = quiz.reward?.coins || 0;
    const correct = quiz.metadata?.correctAnswers || 0;
    const total = quiz.metadata?.totalQuestions || 0;
    const difficulty = quiz.difficulty || 'easy';

    totalCoinsEarned += coins;
    totalQuestionsAnswered += total;
    totalCorrectAnswers += correct;

    if (difficulty in difficultyStats) {
      difficultyStats[difficulty].played += 1;
      difficultyStats[difficulty].coins += coins;
      difficultyStats[difficulty].accuracy =
        ((difficultyStats[difficulty].accuracy * (difficultyStats[difficulty].played - 1)) +
        (total > 0 ? (correct / total) * 100 : 0)) / difficultyStats[difficulty].played;
    }
  });

  const overallAccuracy = totalQuestionsAnswered > 0
    ? (totalCorrectAnswers / totalQuestionsAnswered) * 100
    : 0;

  return {
    totalQuizzes,
    totalCoinsEarned,
    totalQuestionsAnswered,
    totalCorrectAnswers,
    overallAccuracy: Math.round(overallAccuracy * 100) / 100,
    difficultyStats
  };
}

/**
 * Get quiz history
 */
export async function getQuizHistory(userId: string, limit: number = 10): Promise<any[]> {
  const quizzes = await MiniGame.find({
    user: userId,
    gameType: 'quiz',
    status: 'completed'
  })
    .sort({ completedAt: -1 })
    .limit(limit).lean();

  return quizzes.map(q => ({
    id: q._id,
    difficulty: q.difficulty,
    score: q.metadata?.score ?? 0,
    correctAnswers: q.metadata?.correctAnswers ?? 0,
    totalQuestions: q.metadata?.totalQuestions ?? 0,
    accuracy: (q.metadata?.totalQuestions ?? 0) > 0
      ? Math.round(((q.metadata?.correctAnswers ?? 0) / (q.metadata?.totalQuestions ?? 1)) * 100)
      : 0,
    coinsEarned: q.reward?.coins ?? 0,
    completedAt: q.completedAt
  }));
}

export default {
  startQuiz,
  submitAnswer,
  getQuizProgress,
  completeQuiz,
  getQuizStats,
  getQuizHistory
};
