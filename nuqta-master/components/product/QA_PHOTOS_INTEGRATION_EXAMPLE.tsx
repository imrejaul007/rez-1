/**
 * Q&A Section and Customer Photos - Integration Example
 *
 * This file demonstrates how to integrate the new Phase 4.1 components
 * into your MainStorePage or any product detail page.
 *
 * Components:
 * - QASection: Product questions and answers
 * - CustomerPhotos: Customer-uploaded product photos
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { QASection, CustomerPhotos } from '@/components/product';
import { colors } from '@/constants/theme';

// ============================================================================
// MOCK DATA - Replace with real API calls
// ============================================================================

const mockQuestions = [
  {
    id: 'q1',
    userId: 'user1',
    userName: 'John Doe',
    text: 'Is this product waterproof?',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    helpful: 5,
    answers: [
      {
        id: 'a1',
        userId: 'seller',
        userName: 'Store Owner',
        text: 'Yes, it is water-resistant up to 3 meters (IP68 rated). Perfect for swimming and water sports!',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        helpful: 12,
        isSeller: true,
      },
      {
        id: 'a2',
        userId: 'user2',
        userName: 'Jane Smith',
        text: 'I can confirm it works great in the rain! Used it during my hiking trip.',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        helpful: 8,
        isVerifiedPurchase: true,
      },
    ],
  },
  {
    id: 'q2',
    userId: 'user3',
    userName: 'Mike Wilson',
    text: 'What is the battery life like?',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    helpful: 3,
    answers: [
      {
        id: 'a3',
        userId: 'user4',
        userName: 'Sarah Lee',
        text: 'I get about 2 days with moderate use. Heavy use drains it faster.',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        helpful: 5,
        isVerifiedPurchase: true,
      },
    ],
  },
  {
    id: 'q3',
    userId: 'user5',
    userName: 'David Brown',
    text: 'Does it come with a warranty?',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    helpful: 2,
    answers: [],
  },
];

const mockPhotos = [
  {
    id: 'p1',
    userId: 'user2',
    userName: 'Jane Smith',
    imageUrl: 'https://picsum.photos/400/300?random=1',
    caption: 'Absolutely love this product! Works as advertised. Great value for money.',
    helpful: 8,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    isVerifiedPurchase: true,
  },
  {
    id: 'p2',
    userId: 'user4',
    userName: 'Alex Johnson',
    imageUrl: 'https://picsum.photos/400/300?random=2',
    helpful: 15,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    isVerifiedPurchase: true,
  },
  {
    id: 'p3',
    userId: 'user5',
    userName: 'Sarah Lee',
    imageUrl: 'https://picsum.photos/400/300?random=3',
    caption: 'Great quality, highly recommend!',
    helpful: 6,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    isVerifiedPurchase: false,
  },
  {
    id: 'p4',
    userId: 'user6',
    userName: 'Tom Hardy',
    imageUrl: 'https://picsum.photos/400/300?random=4',
    caption: 'Perfect size and color. Exactly what I needed.',
    helpful: 4,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    isVerifiedPurchase: true,
  },
];

// ============================================================================
// INTEGRATION EXAMPLE
// ============================================================================

interface MainStorePageExampleProps {
  route: {
    params: {
      productId: string;
    };
  };
}

export default function MainStorePageExample({ route }: MainStorePageExampleProps) {
  const { productId } = route.params;

  // State management
  const [questions, setQuestions] = useState(mockQuestions);
  const [photos, setPhotos] = useState(mockPhotos);

  // ============================================================================
  // Q&A HANDLERS
  // ============================================================================

  /**
   * Handle asking a new question
   * Replace with actual API call to your backend
   */
  const handleAskQuestion = async (questionText: string) => {
    try {
      // API call example:
      // const response = await fetch(`/api/products/${productId}/questions`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ text: questionText }),
      // });
      // const newQuestion = await response.json();

      // Mock implementation
      const newQuestion = {
        id: `q${Date.now()}`,
        userId: 'currentUser',
        userName: 'Current User',
        text: questionText,
        createdAt: new Date(),
        helpful: 0,
        answers: [],
      };

      setQuestions((prev) => [newQuestion, ...prev]);
      platformAlertSimple('Success', 'Your question has been posted!');
    } catch (error) {
      platformAlertSimple('Error', 'Failed to post question. Please try again.');
      throw error; // Re-throw to show loading state in component
    }
  };

  /**
   * Handle answering a question
   * Replace with actual API call to your backend
   */
  const handleAnswerQuestion = async (questionId: string, answerText: string) => {
    try {
      // API call example:
      // const response = await fetch(`/api/questions/${questionId}/answers`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ text: answerText }),
      // });
      // const newAnswer = await response.json();

      // Mock implementation
      const newAnswer = {
        id: `a${Date.now()}`,
        userId: 'currentUser',
        userName: 'Current User',
        text: answerText,
        createdAt: new Date(),
        helpful: 0,
        isVerifiedPurchase: true, // Based on user's purchase history
      };

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, answers: [...q.answers, newAnswer] }
            : q
        )
      );

      platformAlertSimple('Success', 'Your answer has been posted!');
    } catch (error) {
      platformAlertSimple('Error', 'Failed to post answer. Please try again.');
      throw error;
    }
  };

  /**
   * Handle marking Q&A as helpful
   * Replace with actual API call to your backend
   */
  const handleMarkQAHelpful = (questionId: string, answerId?: string) => {
    try {
      // API call example:
      // fetch(`/api/questions/${questionId}/helpful`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ answerId }),
      // });

      if (answerId) {
        // Mark answer as helpful
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  answers: q.answers.map((a) =>
                    a.id === answerId ? { ...a, helpful: a.helpful + 1 } : a
                  ),
                }
              : q
          )
        );
      } else {
        // Mark question as helpful
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId ? { ...q, helpful: q.helpful + 1 } : q
          )
        );
      }
    } catch (error) {
      // silently handle
    }
  };

  // ============================================================================
  // PHOTO HANDLERS
  // ============================================================================

  /**
   * Handle photo upload
   * Replace with actual API call to your backend
   */
  const handleUploadPhoto = async (photo: { uri: string; caption?: string }) => {
    try {
      // API call example:
      // const formData = new FormData();
      // formData.append('photo', {
      //   uri: photo.uri,
      //   type: 'image/jpeg',
      //   name: 'photo.jpg',
      // } as any);
      // if (photo.caption) {
      //   formData.append('caption', photo.caption);
      // }
      //
      // const response = await fetch(`/api/products/${productId}/photos`, {
      //   method: 'POST',
      //   body: formData,
      //   headers: {
      //     'Content-Type': 'multipart/form-data',
      //   },
      // });
      // const uploadedPhoto = await response.json();

      // Mock implementation
      const uploadedPhoto = {
        id: `p${Date.now()}`,
        userId: 'currentUser',
        userName: 'Current User',
        imageUrl: photo.uri,
        caption: photo.caption,
        helpful: 0,
        createdAt: new Date(),
        isVerifiedPurchase: true,
      };

      setPhotos((prev) => [uploadedPhoto, ...prev]);
      platformAlertSimple('Success', 'Photo uploaded successfully!');
    } catch (error) {
      throw error; // Re-throw to show error in component
    }
  };

  /**
   * Handle marking photo as helpful
   * Replace with actual API call to your backend
   */
  const handleMarkPhotoHelpful = (photoId: string) => {
    try {
      // API call example:
      // fetch(`/api/photos/${photoId}/helpful`, { method: 'POST' });

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, helpful: p.helpful + 1 } : p
        )
      );
    } catch (error) {
      // silently handle
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ScrollView style={styles.container}>
      {/*
        Add your other product sections here:
        - Product images
        - Price
        - Description
        - Specifications
        - etc.
      */}

      {/* Q&A Section */}
      <QASection
        productId={productId}
        questions={questions}
        onAskQuestion={handleAskQuestion}
        onAnswerQuestion={handleAnswerQuestion}
        onMarkHelpful={handleMarkQAHelpful}
        maxQuestions={10} // Show up to 10 questions
      />

      {/* Customer Photos */}
      <CustomerPhotos
        productId={productId}
        photos={photos}
        onUploadPhoto={handleUploadPhoto}
        onMarkHelpful={handleMarkPhotoHelpful}
        maxPhotos={50} // Show up to 50 photos
        enableUpload={true} // Enable upload button
      />

      {/* Add more sections below if needed */}
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});

// ============================================================================
// API SERVICE EXAMPLE (services/productApi.ts)
// ============================================================================

/*
// Example API service functions to implement:

export const submitQuestion = async (productId: string, text: string) => {
  const response = await fetch(`${API_BASE_URL}/products/${productId}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error('Failed to submit question');
  }

  return response.json();
};

export const submitAnswer = async (questionId: string, text: string) => {
  const response = await fetch(`${API_BASE_URL}/questions/${questionId}/answers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error('Failed to submit answer');
  }

  return response.json();
};

export const uploadProductPhoto = async (
  productId: string,
  photo: { uri: string; caption?: string }
) => {
  const formData = new FormData();
  formData.append('photo', {
    uri: photo.uri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  } as any);

  if (photo.caption) {
    formData.append('caption', photo.caption);
  }

  const response = await fetch(`${API_BASE_URL}/products/${productId}/photos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload photo');
  }

  return response.json();
};

export const markHelpful = async (itemId: string, itemType: 'question' | 'answer' | 'photo') => {
  const endpoint = {
    question: `/questions/${itemId}/helpful`,
    answer: `/answers/${itemId}/helpful`,
    photo: `/photos/${itemId}/helpful`,
  }[itemType];

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to mark as helpful');
  }

  return response.json();
};
*/
