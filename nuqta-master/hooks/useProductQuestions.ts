import { useState, useEffect, useCallback } from 'react';
import questionsApi, { ProductQuestion, GetQuestionsParams } from '@/services/questionsApi';

/**
 * Hook for managing product questions and answers
 *
 * Features:
 * - Fetch questions with pagination
 * - Sort by recent, popular, or unanswered
 * - Ask new questions
 * - Answer existing questions
 * - Vote on helpful answers
 * - Refresh data
 */

interface UseProductQuestionsProps {
  productId: string;
  initialSort?: 'recent' | 'popular' | 'unanswered';
  autoLoad?: boolean;
}

interface UseProductQuestionsReturn {
  questions: ProductQuestion[];
  stats: {
    total: number;
    answered: number;
    unanswered: number;
  };
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  sortBy: 'recent' | 'popular' | 'unanswered';
  page: number;
  hasMore: boolean;
  loadQuestions: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  changeSortBy: (sort: 'recent' | 'popular' | 'unanswered') => void;
  askQuestion: (questionText: string) => Promise<void>;
  answerQuestion: (questionId: string, answerText: string) => Promise<void>;
  markAnswerHelpful: (questionId: string, answerId: string) => Promise<void>;
}

export const useProductQuestions = ({
  productId,
  initialSort = 'recent',
  autoLoad = true,
}: UseProductQuestionsProps): UseProductQuestionsReturn => {
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    answered: 0,
    unanswered: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'unanswered'>(initialSort);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /**
   * Load questions from API
   */
  const loadQuestions = useCallback(
    async (pageNum: number = 1, refresh: boolean = false) => {
      if (!productId) return;

      try {
        if (refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);


        const response = await questionsApi.getProductQuestions(productId, {
          page: pageNum,
          limit: 10,
          sortBy,
        });

        if (response.success) {
          if (pageNum === 1 || refresh) {
            setQuestions(response.data.questions);
          } else {
            setQuestions(prev => [...prev, ...response.data.questions]);
          }

          setStats(response.data.stats);
          setPage(pageNum);
          setTotalPages(response.data.pagination.pages);

        } else {
          throw new Error('Failed to load questions');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load questions');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [productId, sortBy]
  );

  /**
   * Load more questions (pagination)
   */
  const loadMore = useCallback(async () => {
    if (page < totalPages && !isLoading) {
      await loadQuestions(page + 1, false);
    }
  }, [page, totalPages, isLoading, loadQuestions]);

  /**
   * Refresh questions (reload from page 1)
   */
  const refresh = useCallback(async () => {
    await loadQuestions(1, true);
  }, [loadQuestions]);

  /**
   * Change sort order
   */
  const changeSortBy = useCallback(
    (sort: 'recent' | 'popular' | 'unanswered') => {
      setSortBy(sort);
      setPage(1); // Reset to page 1 when sorting changes
    },
    []
  );

  /**
   * Ask a new question
   */
  const askQuestion = useCallback(
    async (questionText: string) => {
      try {

        const response = await questionsApi.askQuestion({
          productId,
          question: questionText,
        });

        if (response.success) {
          // Refresh questions to include the new one
          await refresh();
        } else {
          throw new Error(response.message || 'Failed to post question');
        }
      } catch (err: any) {
        throw err;
      }
    },
    [productId, refresh]
  );

  /**
   * Answer a question
   */
  const answerQuestion = useCallback(
    async (questionId: string, answerText: string) => {
      try {

        const response = await questionsApi.answerQuestion({
          questionId,
          answer: answerText,
        });

        if (response.success) {

          // Update local state with new answer
          setQuestions(prev =>
            prev.map(q =>
              q._id === questionId
                ? { ...q, answers: response.data.answers, answerCount: response.data.answerCount }
                : q
            )
          );
        } else {
          throw new Error(response.message || 'Failed to post answer');
        }
      } catch (err: any) {
        throw err;
      }
    },
    []
  );

  /**
   * Mark an answer as helpful
   */
  const markAnswerHelpful = useCallback(async (questionId: string, answerId: string) => {
    try {

      const response = await questionsApi.markAnswerHelpful(questionId, answerId);

      if (response.success) {

        // Update local state
        setQuestions(prev =>
          prev.map(q => {
            if (q._id === questionId) {
              return {
                ...q,
                answers: q.answers.map(a =>
                  a._id === answerId
                    ? {
                        ...a,
                        helpful: {
                          count: response.data.helpfulCount,
                          users: response.data.isHelpful
                            ? [...a.helpful.users, 'current-user'] // Simplified
                            : a.helpful.users.filter(id => id !== 'current-user'),
                        },
                      }
                    : a
                ),
              };
            }
            return q;
          })
        );
      }
    } catch (err: any) {
      throw err;
    }
  }, []);

  /**
   * Auto-load on mount and when sortBy changes
   */
  useEffect(() => {
    if (autoLoad && productId) {
      loadQuestions(1, false);
    }
  }, [autoLoad, productId, sortBy, loadQuestions]);

  return {
    questions,
    stats,
    isLoading,
    isRefreshing,
    error,
    sortBy,
    page,
    hasMore: page < totalPages,
    loadQuestions: () => loadQuestions(1, false),
    loadMore,
    refresh,
    changeSortBy,
    askQuestion,
    answerQuestion,
    markAnswerHelpful,
  };
};

export default useProductQuestions;
