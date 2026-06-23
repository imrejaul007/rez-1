// @ts-nocheck
import apiClient from './apiClient';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

/**
 * Questions API Service
 *
 * Frontend service for product Q&A operations
 */

export interface QuestionAnswer {
  _id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  answerType: 'user' | 'store' | 'admin';
  isVerifiedPurchase: boolean;
  isStoreRepresentative: boolean;
  helpful: {
    count: number;
    users: string[];
  };
  answeredAt: Date;
}

export interface ProductQuestion {
  _id: string;
  productId: string;
  question: {
    text: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    isVerifiedPurchase: boolean;
    askedAt: Date;
  };
  answers: QuestionAnswer[];
  answerCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetQuestionsParams {
  page?: number;
  limit?: number;
  sortBy?: 'recent' | 'popular' | 'unanswered';
}

export interface QuestionsResponse {
  success: boolean;
  data: {
    questions: ProductQuestion[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    stats: {
      total: number;
      answered: number;
      unanswered: number;
    };
  };
}

export interface AskQuestionParams {
  productId: string;
  question: string;
}

export interface AnswerQuestionParams {
  questionId: string;
  answer: string;
}

export interface MarkHelpfulResponse {
  success: boolean;
  data: {
    answerId: string;
    helpfulCount: number;
    isHelpful: boolean;
  };
}

const questionsApi = {
  /**
   * Get questions for a product
   */
  getProductQuestions: async (
    productId: string,
    params: GetQuestionsParams = {}
  ): Promise<QuestionsResponse> => {
    try {
      devLog.log(`📋 [QuestionsAPI] Getting questions for product: ${productId}`);

      const { page = 1, limit = 10, sortBy = 'recent' } = params;

      const response = await apiClient.get(`/products/${productId}/questions`, {
        params: { page, limit, sortBy },
      });

      devLog.log('✅ [QuestionsAPI] Questions retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      devLog.error('❌ [QuestionsAPI] Error getting questions:', error);
      return {
        success: false,
        data: {
          questions: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 },
          stats: { total: 0, answered: 0, unanswered: 0 },
        },
      };
    }
  },

  /**
   * Ask a question about a product
   */
  askQuestion: async (params: AskQuestionParams): Promise<any> => {
    try {
      devLog.log('❓ [QuestionsAPI] Asking question:', params);

      const response = await apiClient.post(`/products/${params.productId}/questions`, {
        question: params.question,
      });

      devLog.log('✅ [QuestionsAPI] Question posted:', response.data);
      return response.data;
    } catch (error: any) {
      devLog.error('❌ [QuestionsAPI] Error asking question:', error);
      throw error;
    }
  },

  /**
   * Answer a question
   */
  answerQuestion: async (params: AnswerQuestionParams): Promise<any> => {
    try {
      devLog.log('💬 [QuestionsAPI] Answering question:', params);

      const response = await apiClient.post(`/questions/${params.questionId}/answers`, {
        answer: params.answer,
      });

      devLog.log('✅ [QuestionsAPI] Answer posted:', response.data);
      return response.data;
    } catch (error: any) {
      devLog.error('❌ [QuestionsAPI] Error answering question:', error);
      throw error;
    }
  },

  /**
   * Mark an answer as helpful
   */
  markAnswerHelpful: async (questionId: string, answerId: string): Promise<MarkHelpfulResponse> => {
    try {
      devLog.log(`👍 [QuestionsAPI] Marking answer as helpful: ${answerId}`);

      const response = await apiClient.post(
        `/questions/${questionId}/answers/${answerId}/helpful`
      );

      devLog.log('✅ [QuestionsAPI] Vote recorded:', response.data);
      return response.data;
    } catch (error: any) {
      devLog.error('❌ [QuestionsAPI] Error marking helpful:', error);
      throw error;
    }
  },

  /**
   * Get user's questions
   */
  getUserQuestions: async (params: GetQuestionsParams = {}): Promise<QuestionsResponse> => {
    try {
      devLog.log('📋 [QuestionsAPI] Getting user questions');

      const { page = 1, limit = 10 } = params;

      const response = await apiClient.get('/users/me/questions', {
        params: { page, limit },
      });

      devLog.log('✅ [QuestionsAPI] User questions retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      devLog.error('❌ [QuestionsAPI] Error getting user questions:', error);
      return {
        success: false,
        data: {
          questions: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 },
          stats: { total: 0, answered: 0, unanswered: 0 },
        },
      };
    }
  },

  /**
   * Delete a question
   */
  deleteQuestion: async (questionId: string): Promise<any> => {
    try {
      devLog.log(`🗑️ [QuestionsAPI] Deleting question: ${questionId}`);

      const response = await apiClient.delete(`/questions/${questionId}`);

      devLog.log('✅ [QuestionsAPI] Question deleted:', response.data);
      return response.data;
    } catch (error: any) {
      devLog.error('❌ [QuestionsAPI] Error deleting question:', error);
      throw error;
    }
  },

  /**
   * Report a question
   */
  reportQuestion: async (questionId: string, reason: string): Promise<any> => {
    try {
      devLog.log(`🚩 [QuestionsAPI] Reporting question: ${questionId}`);

      const response = await apiClient.post(`/questions/${questionId}/report`, {
        reason,
      });

      devLog.log('✅ [QuestionsAPI] Question reported:', response.data);
      return response.data;
    } catch (error: any) {
      devLog.error('❌ [QuestionsAPI] Error reporting question:', error);
      throw error;
    }
  },
};

export default questionsApi;
