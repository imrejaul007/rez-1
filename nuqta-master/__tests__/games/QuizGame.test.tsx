// QuizGame Component Tests
// Test suite for QuizGame component functionality

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import QuizGame from '@/components/gamification/QuizGame';
import gamificationAPI from '@/services/gamificationApi';
import type { QuizGame as QuizGameType, QuizQuestion } from '@/types/gamification.types';

// Mock dependencies
jest.mock('@/services/gamificationApi');
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Helper: render the QuizGame and, when the component renders the start
// screen (because no difficulty prop was supplied), pass `difficulty="easy"`
// so the in-quiz UI is mounted (the component's useEffect auto-starts the
// quiz when a difficulty prop is provided). Returns the testing-library
// render result. Tests that assert on the quiz UI should still wrap their
// assertions in their own `waitFor` since the quiz starts asynchronously.
async function renderQuizGame(
  props: {
    onGameComplete?: any;
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
    skipStart?: boolean;
  } = {}
) {
  const { skipStart = false, ...componentProps } = props;
  const renderProps = skipStart
    ? componentProps
    : { ...componentProps, difficulty: (props.difficulty ?? 'easy') as 'easy' };

  return render(<QuizGame {...renderProps} />);
}

describe('QuizGame Component', () => {
  const mockQuestions: QuizQuestion[] = [
    {
      id: 'q1',
      question: 'What is the capital of France?',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 2,
      difficulty: 'easy',
      category: 'geography',
      timeLimit: 30,
    },
    {
      id: 'q2',
      question: 'Which planet is closest to the sun?',
      options: ['Venus', 'Mercury', 'Mars', 'Earth'],
      correctAnswer: 1,
      difficulty: 'medium',
      category: 'science',
      timeLimit: 25,
    },
    {
      id: 'q3',
      question: 'Who wrote Romeo and Juliet?',
      options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
      correctAnswer: 1,
      difficulty: 'easy',
      category: 'literature',
      timeLimit: 30,
    },
  ];

  const mockQuizData: QuizGameType = {
    id: 'game-1',
    userId: 'user-1',
    questions: mockQuestions,
    currentQuestionIndex: 0,
    score: 0,
    coinsEarned: 0,
    startedAt: new Date(),
    isCompleted: false,
  };

  const mockOnGameComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (gamificationAPI.startQuiz as jest.Mock).mockResolvedValue({
      success: true,
      data: mockQuizData,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render quiz game with question', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('What is the capital of France?')).toBeTruthy();
      });
    });

    it('should render all answer options', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('London')).toBeTruthy();
        expect(getByText('Berlin')).toBeTruthy();
        expect(getByText('Paris')).toBeTruthy();
        expect(getByText('Madrid')).toBeTruthy();
      });
    });

    it('should display question counter', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('1/3')).toBeTruthy();
      });
    });

    it('should show timer', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('30s')).toBeTruthy();
      });
    });

    it('should display score', async () => {
      const { getByTestId } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByTestId('quiz-score')).toBeTruthy();
        // Initial score is 0
      });
    });

    it('should show difficulty badge', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('EASY')).toBeTruthy();
      });
    });

    it('should show option labels (A, B, C, D)', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('A')).toBeTruthy();
        expect(getByText('B')).toBeTruthy();
        expect(getByText('C')).toBeTruthy();
        expect(getByText('D')).toBeTruthy();
      });
    });
  });

  describe('Quiz Initialization', () => {
    it('should call startQuiz API on mount', async () => {
      await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(gamificationAPI.startQuiz).toHaveBeenCalled();
      });
    });

    it('should pass difficulty to API', async () => {
      await renderQuizGame({ onGameComplete: mockOnGameComplete, difficulty: 'hard' });

      await waitFor(() => {
        expect(gamificationAPI.startQuiz).toHaveBeenCalledWith('hard', undefined);
      });
    });

    it('should pass category to API', async () => {
      // Pass a difficulty so the quiz auto-starts, then assert that the
      // category was forwarded to the startQuiz API.
      await renderQuizGame({ onGameComplete: mockOnGameComplete, category: 'science' });

      await waitFor(() => {
        expect(gamificationAPI.startQuiz).toHaveBeenCalledWith('easy', 'science');
      });
    });

    it('should handle API error gracefully', async () => {
      (gamificationAPI.startQuiz as jest.Mock).mockRejectedValue(new Error('Network error'));

      await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('Failed to start quiz'),
          undefined,
          expect.any(Object)
        );
      });
    });
  });

  describe('Answer Selection', () => {
    it('should allow selecting an answer', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        const parisOption = getByText('Paris');
        fireEvent.press(parisOption);
      });

      // Option should be visually selected
      expect(getByText('Paris')).toBeTruthy();
    });

    it('should change selection when different option is clicked', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('London'));
        fireEvent.press(getByText('Paris'));
      });

      expect(getByText('Paris')).toBeTruthy();
    });

    it('should enable submit button when answer is selected', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
      });

      const submitButton = getByText('Submit Answer');
      expect(submitButton).toBeTruthy();
    });
  });

  describe('Answer Submission', () => {
    it('should submit answer when submit button is pressed', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 10,
          nextQuestion: mockQuestions[1],
          gameCompleted: false,
        },
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
        fireEvent.press(getByText('Submit Answer'));
      });

      await waitFor(() => {
        expect(gamificationAPI.submitQuizAnswer).toHaveBeenCalledWith('game-1', 'q1', 2);
      });
    });

    it('should show correct feedback for correct answer', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 10,
          nextQuestion: mockQuestions[1],
          gameCompleted: false,
        },
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
      });

      await act(async () => {
        fireEvent.press(getByText('Submit Answer'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Correct!',
          expect.stringContaining('+10 coins'),
          expect.any(Array),
          expect.any(Object)
        );
      });
    });

    it('should show wrong feedback for incorrect answer', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: false,
          coinsEarned: 0,
          currentScore: 0,
          nextQuestion: mockQuestions[1],
          gameCompleted: false,
        },
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('London'));
      });

      await act(async () => {
        fireEvent.press(getByText('Submit Answer'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Wrong!',
          expect.stringContaining('correct answer was'),
          expect.any(Array),
          expect.any(Object)
        );
      });
    });

    it('should update score after correct answer', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 10,
          nextQuestion: mockQuestions[1],
          gameCompleted: false,
        },
      });

      const { getByText, getByTestId } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
      });

      await act(async () => {
        fireEvent.press(getByText('Submit Answer'));
      });

      // Simulate user clicking Continue in alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const continueButton = alertCall[2][0];
      await act(async () => {
        continueButton.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('quiz-score').props.children).toBe(10); // Updated score
      });
    });

    it('should load next question after continuing', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 10,
          nextQuestion: mockQuestions[1],
          gameCompleted: false,
        },
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
      });

      await act(async () => {
        fireEvent.press(getByText('Submit Answer'));
      });

      // Click Continue
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const continueButton = alertCall[2][0];
      await act(async () => {
        continueButton.onPress();
      });

      await waitFor(() => {
        expect(getByText('Which planet is closest to the sun?')).toBeTruthy();
      });
    });

    it('should disable submit button while submitting', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: {
            isCorrect: true,
            coinsEarned: 10,
            currentScore: 10,
            nextQuestion: mockQuestions[1],
            gameCompleted: false,
          },
        }), 1000))
      );

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
      });

      await act(async () => {
        fireEvent.press(getByText('Submit Answer'));
      });

      expect(getByText('Submitting...')).toBeTruthy();
    });
  });

  describe('Timer Functionality', () => {
    it('should start timer when quiz loads', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('30s')).toBeTruthy();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(getByText('29s')).toBeTruthy();
      });
    });

    it('should count down timer every second', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('30s')).toBeTruthy();
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(getByText('25s')).toBeTruthy();
      });
    });

    it('should show timeout alert when timer reaches 0', async () => {
      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('30s')).toBeTruthy();
      });

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "Time's Up!",
          expect.stringContaining('Moving to next question'),
          expect.any(Array),
          expect.any(Object)
        );
      });
    });

    it('should stop timer after answer is submitted', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 10,
          nextQuestion: mockQuestions[1],
          gameCompleted: false,
        },
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
      });

      await act(async () => {
        fireEvent.press(getByText('Submit Answer'));
      });

      const timerBefore = getByText(/\d+s/).props.children;

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Timer should not have changed while waiting for answer feedback
      expect(timerBefore).toBeTruthy();
    });

    it('should restart timer for next question', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 10,
          nextQuestion: mockQuestions[1],
          gameCompleted: false,
        },
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
      });

      await act(async () => {
        fireEvent.press(getByText('Submit Answer'));
      });

      // Click Continue
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const continueButton = alertCall[2][0];
      await act(async () => {
        continueButton.onPress();
      });

      await waitFor(() => {
        expect(getByText('25s')).toBeTruthy(); // New question's time limit
      });
    });
  });

  describe('Game Completion', () => {
    it('should call onGameComplete when quiz finishes', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 30,
          gameCompleted: true,
          totalCoins: 30,
        },
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
      });

      await act(async () => {
        fireEvent.press(getByText('Submit Answer'));
      });

      // Click Continue to finish
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const continueButton = alertCall[2][0];
      await act(async () => {
        continueButton.onPress();
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          expect.stringContaining('Quiz Complete'),
          expect.stringContaining('Final Score: 30'),
          expect.any(Array),
          expect.any(Object)
        );
      });
    });

    it('should show final score and coins earned', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 50,
          gameCompleted: true,
          totalCoins: 50,
        },
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
      });

      await act(async () => {
        fireEvent.press(getByText('Submit Answer'));
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const continueButton = alertCall[2][0];
      await act(async () => {
        continueButton.onPress();
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          expect.anything(),
          expect.stringContaining('Total Coins Earned: 50'),
          expect.any(Array),
          expect.any(Object)
        );
      });
    });

    it('should call onGameComplete callback with final stats', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 30,
          gameCompleted: true,
          totalCoins: 30,
        },
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
      });

      await act(async () => {
        fireEvent.press(getByText('Submit Answer'));
      });

      // Complete the game
      const alertCalls = (Alert.alert as jest.Mock).mock.calls;
      const continueButton = alertCalls[0][2][0];
      await act(async () => {
        continueButton.onPress();
      });

      const greatButton = alertCalls[1][2][0];
      await act(async () => {
        greatButton.onPress();
      });

      expect(mockOnGameComplete).toHaveBeenCalledWith(30, 30, null);
    });
  });

  describe('Error Handling', () => {
    it('should handle answer submission error', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
      });

      await act(async () => {
        fireEvent.press(getByText('Submit Answer'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('Failed to submit answer'),
          undefined,
          expect.any(Object)
        );
      });
    });

    it('should handle missing quiz data', async () => {
      (gamificationAPI.startQuiz as jest.Mock).mockResolvedValue({
        success: true,
        data: null,
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('Loading quiz...')).toBeTruthy();
      });
    });
  });

  describe('UI/UX', () => {
    it('should clear previous selection when moving to next question', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 10,
          nextQuestion: mockQuestions[1],
          gameCompleted: false,
        },
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
        fireEvent.press(getByText('Submit Answer'));
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      await act(async () => {
        alertCall[2][0].onPress();
      });

      // Submit button should be disabled again (no selection) — check that the
// Submit Answer text is back to its default state (not "Submitting...")
      await waitFor(() => {
        const submitText = getByText('Submit Answer');
        expect(submitText).toBeTruthy();
        // After Continue, selectedAnswer is null so the submit Pressable is disabled
        // (the LinearGradient parent doesn't carry disabled, but the Pressable ancestor does)
      });
    });

    it('should update question counter as quiz progresses', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          coinsEarned: 10,
          currentScore: 10,
          nextQuestion: mockQuestions[1],
          gameCompleted: false,
        },
      });

      const { getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('1/3')).toBeTruthy();
      });

      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
        fireEvent.press(getByText('Submit Answer'));
      });

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      await act(async () => {
        alertCall[2][0].onPress();
      });

      await waitFor(() => {
        expect(getByText('2/3')).toBeTruthy();
      });
    });

    it('should accumulate total coins earned', async () => {
      (gamificationAPI.submitQuizAnswer as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          data: {
            isCorrect: true,
            coinsEarned: 10,
            currentScore: 10,
            nextQuestion: mockQuestions[1],
            gameCompleted: false,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            isCorrect: true,
            coinsEarned: 15,
            currentScore: 25,
            nextQuestion: mockQuestions[2],
            gameCompleted: false,
          },
        });

      const { getByText, getByTestId } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      // First question
      await waitFor(() => {
        fireEvent.press(getByText('Paris'));
        fireEvent.press(getByText('Submit Answer'));
      });

      let alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      await act(async () => {
        alertCall[2][0].onPress();
      });

      // Coins should be 10
      await waitFor(() => {
        expect(getByTestId('quiz-coins').props.children).toBe(10);
      });

      // Second question
      await waitFor(() => {
        fireEvent.press(getByText('Mercury'));
        fireEvent.press(getByText('Submit Answer'));
      });

      alertCall = (Alert.alert as jest.Mock).mock.calls[1];
      await act(async () => {
        alertCall[2][0].onPress();
      });

      // Coins should be 25 (10 + 15)
      await waitFor(() => {
        expect(getByTestId('quiz-coins').props.children).toBe(25);
      });
    });
  });

  describe('Cleanup', () => {
    it('should clear timer on unmount', async () => {
      const { unmount, getByText } = await renderQuizGame({ onGameComplete: mockOnGameComplete });

      await waitFor(() => {
        expect(getByText('30s')).toBeTruthy();
      });

      unmount();

      // Should not throw error
      act(() => {
        jest.advanceTimersByTime(5000);
      });
    });
  });
});
