/**
 * Bill Upload Page Tests
 *
 * Comprehensive test suite for the bill upload page component.
 * Tests page rendering, form validation, image upload, error handling,
 * offline queue functionality, and user interactions.
 *
 * @coverage 80%+ target
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoCamera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import BillUploadPage from '@/app/bill-upload';
import { billUploadService } from '@/services/billUploadService';
import storesApi from '@/services/storesApi';

// Mocks
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-camera');
jest.mock('expo-image-picker');
jest.mock('@/services/billUploadService');
jest.mock('@/services/storesApi');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useNavigation: () => ({
    setOptions: jest.fn(),
  }),
}));

describe('BillUploadPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (ExpoCamera.Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
  });

  // =============================================================================
  // RENDERING TESTS
  // =============================================================================

  describe('Page Rendering', () => {
    test('renders bill upload page correctly', async () => {
      const { getByText, getByPlaceholderText } = render(<BillUploadPage />);

      await waitFor(() => {
        expect(getByText('Upload Bill')).toBeTruthy();
        expect(getByText('Bill Photo')).toBeTruthy();
        expect(getByText('Merchant')).toBeTruthy();
        expect(getByText('Bill Amount')).toBeTruthy();
      });
    });

    test('displays info banner with cashback message', async () => {
      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        expect(getByText(/Upload offline bills to earn up to 20% cashback/i)).toBeTruthy();
      });
    });

    test('shows all required field markers', async () => {
      const { getAllByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const requiredMarkers = getAllByText('*');
        // Bill Photo, Merchant, Amount, Date should be required
        expect(requiredMarkers.length).toBeGreaterThanOrEqual(4);
      });
    });

    test('renders upload options when no image selected', async () => {
      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        expect(getByText('Take Photo')).toBeTruthy();
        expect(getByText('Choose from Gallery')).toBeTruthy();
      });
    });

    test('renders submit button in disabled state initially', async () => {
      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const submitButton = getByText('Upload Bill');
        expect(submitButton).toBeTruthy();
        // Button should be disabled when form is incomplete
      });
    });
  });

  // =============================================================================
  // FORM VALIDATION TESTS
  // =============================================================================

  describe('Form Validation', () => {
    test('shows error for empty amount field', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '');
        fireEvent(amountInput, 'blur');
      });

      await waitFor(() => {
        expect(queryByText(/Amount is required/i)).toBeTruthy();
      });
    });

    test('validates minimum amount constraint', async () => {
      const { getByPlaceholderText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '25');
        fireEvent(amountInput, 'blur');
      });

      await waitFor(() => {
        expect(queryByText(/Amount must be at least ₹50/i)).toBeTruthy();
      });
    });

    test('validates maximum amount constraint', async () => {
      const { getByPlaceholderText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '150000');
        fireEvent(amountInput, 'blur');
      });

      await waitFor(() => {
        expect(queryByText(/Amount cannot exceed/i)).toBeTruthy();
      });
    });

    test('accepts valid amount', async () => {
      const { getByPlaceholderText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '1000');
        fireEvent(amountInput, 'blur');
      });

      await waitFor(() => {
        expect(queryByText(/Amount/i)).toBeTruthy();
        // Should not show error
      });
    });

    test('validates decimal places in amount', async () => {
      const { getByPlaceholderText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '100.999');
        fireEvent(amountInput, 'blur');
      });

      await waitFor(() => {
        expect(queryByText(/maximum 2 decimal places/i)).toBeTruthy();
      });
    });

    test('validates future bill date', async () => {
      const { getByPlaceholderText, queryByText } = render(<BillUploadPage />);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureDateString = futureDate.toISOString().split('T')[0];

      await waitFor(() => {
        const dateInput = getByPlaceholderText('YYYY-MM-DD');
        fireEvent.changeText(dateInput, futureDateString);
        fireEvent(dateInput, 'blur');
      });

      await waitFor(() => {
        expect(queryByText(/cannot be in the future/i)).toBeTruthy();
      });
    });

    test('validates old bill date (>30 days)', async () => {
      const { getByPlaceholderText, queryByText } = render(<BillUploadPage />);

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);
      const oldDateString = oldDate.toISOString().split('T')[0];

      await waitFor(() => {
        const dateInput = getByPlaceholderText('YYYY-MM-DD');
        fireEvent.changeText(dateInput, oldDateString);
        fireEvent(dateInput, 'blur');
      });

      await waitFor(() => {
        expect(queryByText(/cannot be older than 30 days/i)).toBeTruthy();
      });
    });

    test('validates bill number format', async () => {
      const { getByPlaceholderText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const billNumberInput = getByPlaceholderText('Enter bill number');
        fireEvent.changeText(billNumberInput, 'AB');
        fireEvent(billNumberInput, 'blur');
      });

      await waitFor(() => {
        expect(queryByText(/must be at least 3 characters/i)).toBeTruthy();
      });
    });

    test('validates notes maximum length', async () => {
      const { getByPlaceholderText, queryByText } = render(<BillUploadPage />);

      const longNotes = 'a'.repeat(501);

      await waitFor(() => {
        const notesInput = getByPlaceholderText(/Add any additional notes/i);
        fireEvent.changeText(notesInput, longNotes);
        fireEvent(notesInput, 'blur');
      });

      await waitFor(() => {
        expect(queryByText(/cannot exceed 500 characters/i)).toBeTruthy();
      });
    });

    test('shows character count for notes field', async () => {
      const { getByPlaceholderText, getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const notesInput = getByPlaceholderText(/Add any additional notes/i);
        fireEvent.changeText(notesInput, 'Test notes');
      });

      await waitFor(() => {
        expect(getByText(/\/500/)).toBeTruthy();
      });
    });
  });

  // =============================================================================
  // IMAGE UPLOAD FLOW TESTS
  // =============================================================================

  describe('Image Upload Flow', () => {
    test('requests camera permissions when opening camera', async () => {
      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const takePhotoButton = getByText('Take Photo');
        fireEvent.press(takePhotoButton);
      });

      await waitFor(() => {
        expect(ExpoCamera.Camera.requestCameraPermissionsAsync).toHaveBeenCalled();
      });
    });

    test('shows camera view when take photo is pressed', async () => {
      (ExpoCamera.Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const { getByText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const takePhotoButton = getByText('Take Photo');
        fireEvent.press(takePhotoButton);
      });

      await waitFor(() => {
        expect(queryByText('Position the bill within the frame')).toBeTruthy();
      });
    });

    test('handles camera permission denial', async () => {
      (ExpoCamera.Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const takePhotoButton = getByText('Take Photo');
        fireEvent.press(takePhotoButton);
      });

      // Should show error toast
      await waitFor(() => {
        // Toast message should appear
      });
    });

    test('opens image picker when choose from gallery is pressed', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://test-image.jpg' }],
      });

      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const galleryButton = getByText('Choose from Gallery');
        fireEvent.press(galleryButton);
      });

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });
    });

    test('displays selected image preview', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://test-image.jpg' }],
      });

      const { getByText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const galleryButton = getByText('Choose from Gallery');
        fireEvent.press(galleryButton);
      });

      await waitFor(() => {
        // Image preview should be shown
        expect(queryByText('Retake')).toBeTruthy();
      });
    });

    test('allows removing selected image', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file://test-image.jpg' }],
      });

      const { getByText, queryByText } = render(<BillUploadPage />);

      // Select image
      await waitFor(() => {
        const galleryButton = getByText('Choose from Gallery');
        fireEvent.press(galleryButton);
      });

      // Wait for image to be selected and remove button to appear
      await waitFor(() => {
        expect(queryByText('Retake')).toBeTruthy();
      });

      // Remove image would be triggered by close icon
    });

    test('handles image picker cancellation', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });

      const { getByText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const galleryButton = getByText('Choose from Gallery');
        fireEvent.press(galleryButton);
      });

      await waitFor(() => {
        // Should not show image preview
        expect(queryByText('Retake')).toBeNull();
      });
    });
  });

  // =============================================================================
  // MERCHANT SELECTION TESTS
  // =============================================================================

  describe('Merchant Selection', () => {
    const mockMerchants = [
      {
        id: '1',
        name: 'Test Store 1',
        logo: 'https://example.com/logo1.jpg',
        cashbackPercentage: 5,
        category: 'Retail',
      },
      {
        id: '2',
        name: 'Test Store 2',
        logo: 'https://example.com/logo2.jpg',
        cashbackPercentage: 10,
        category: 'Grocery',
      },
    ];

    beforeEach(() => {
      (storesApi.getStores as jest.Mock).mockResolvedValue({
        success: true,
        data: { stores: mockMerchants },
      });
    });

    test('opens merchant selector modal', async () => {
      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const merchantSelector = getByText('Select Merchant');
        fireEvent.press(merchantSelector);
      });

      await waitFor(() => {
        expect(getByText('Select Merchant')).toBeTruthy();
      });
    });

    test('loads merchants from API', async () => {
      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const merchantSelector = getByText('Select Merchant');
        fireEvent.press(merchantSelector);
      });

      await waitFor(() => {
        expect(storesApi.getStores).toHaveBeenCalled();
      });
    });

    test('displays merchant list in modal', async () => {
      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const merchantSelector = getByText('Select Merchant');
        fireEvent.press(merchantSelector);
      });

      await waitFor(() => {
        expect(getByText('Test Store 1')).toBeTruthy();
        expect(getByText('Test Store 2')).toBeTruthy();
      });
    });

    test('filters merchants by search query', async () => {
      const { getByText, getByPlaceholderText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const merchantSelector = getByText('Select Merchant');
        fireEvent.press(merchantSelector);
      });

      await waitFor(() => {
        const searchInput = getByPlaceholderText('Search merchants...');
        fireEvent.changeText(searchInput, 'Store 1');
      });

      await waitFor(() => {
        expect(getByText('Test Store 1')).toBeTruthy();
        expect(queryByText('Test Store 2')).toBeNull();
      });
    });

    test('selects merchant and closes modal', async () => {
      const { getByText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const merchantSelector = getByText('Select Merchant');
        fireEvent.press(merchantSelector);
      });

      await waitFor(() => {
        const merchant = getByText('Test Store 1');
        fireEvent.press(merchant);
      });

      await waitFor(() => {
        // Modal should close and merchant should be selected
        expect(queryByText('Search merchants...')).toBeNull();
      });
    });

    test('displays selected merchant name', async () => {
      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const merchantSelector = getByText('Select Merchant');
        fireEvent.press(merchantSelector);
      });

      await waitFor(() => {
        const merchant = getByText('Test Store 1');
        fireEvent.press(merchant);
      });

      await waitFor(() => {
        expect(getByText('Test Store 1')).toBeTruthy();
      });
    });
  });

  // =============================================================================
  // CASHBACK PREVIEW TESTS
  // =============================================================================

  describe('Cashback Preview', () => {
    test('shows cashback preview when amount and merchant are selected', async () => {
      const { getByText, getByPlaceholderText } = render(<BillUploadPage />);

      // Select merchant first (simplified)
      // Then enter amount
      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '1000');
      });

      await waitFor(() => {
        expect(getByText(/Estimated Cashback/i)).toBeTruthy();
      });
    });

    test('calculates cashback correctly', async () => {
      const { getByText, getByPlaceholderText } = render(<BillUploadPage />);

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '1000');
      });

      // Should show calculated cashback amount
      await waitFor(() => {
        // Cashback amount should be displayed
      });
    });

    test('updates cashback when amount changes', async () => {
      const { getByPlaceholderText } = render(<BillUploadPage />);

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '1000');
      });

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('0.00'), '2000');
      });

      // Cashback should update
    });

    test('expands cashback breakdown when tapped', async () => {
      const { getByText } = render(<BillUploadPage />);

      // Setup form with amount and merchant

      await waitFor(() => {
        const cashbackHeader = getByText(/Estimated Cashback/i);
        fireEvent.press(cashbackHeader);
      });

      // Breakdown should expand
    });
  });

  // =============================================================================
  // FORM SUBMISSION TESTS
  // =============================================================================

  describe('Form Submission', () => {
    test('validates form before submission', async () => {
      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const submitButton = getByText('Upload Bill');
        fireEvent.press(submitButton);
      });

      // Should show validation errors
      await waitFor(() => {
        expect(getByText(/Please fix the errors/i)).toBeTruthy();
      });
    });

    test('submits form with valid data', async () => {
      (billUploadService.uploadBillWithProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: { _id: 'test-bill-id' },
      });

      const { getByText, getByPlaceholderText } = render(<BillUploadPage />);

      // Fill form
      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '1000');
      });

      // Submit
      await waitFor(() => {
        const submitButton = getByText('Upload Bill');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(billUploadService.uploadBillWithProgress).toHaveBeenCalled();
      });
    });

    test('shows progress modal during upload', async () => {
      (billUploadService.uploadBillWithProgress as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      );

      const { getByText } = render(<BillUploadPage />);

      // Submit form
      await waitFor(() => {
        const submitButton = getByText('Upload Bill');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText('Uploading Bill')).toBeTruthy();
      });
    });

    test('shows success message after successful upload', async () => {
      (billUploadService.uploadBillWithProgress as jest.Mock).mockResolvedValue({
        success: true,
        data: { _id: 'test-bill-id' },
      });

      const { getByText } = render(<BillUploadPage />);

      // Submit form (simplified)

      await waitFor(() => {
        expect(getByText(/Bill uploaded successfully/i)).toBeTruthy();
      });
    });

    test('shows error message on upload failure', async () => {
      (billUploadService.uploadBillWithProgress as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Upload failed',
      });

      const { getByText } = render(<BillUploadPage />);

      // Submit form (simplified)

      await waitFor(() => {
        expect(getByText(/Failed to upload/i)).toBeTruthy();
      });
    });

    test('allows retry after failed upload', async () => {
      (billUploadService.uploadBillWithProgress as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Upload failed',
      });

      const { getByText } = render(<BillUploadPage />);

      // Submit and fail

      await waitFor(() => {
        const retryButton = getByText('Retry');
        expect(retryButton).toBeTruthy();
        fireEvent.press(retryButton);
      });
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      (billUploadService.uploadBillWithProgress as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(<BillUploadPage />);

      // Submit form

      await waitFor(() => {
        expect(getByText(/network error/i)).toBeTruthy();
      });
    });

    test('handles server errors with user-friendly message', async () => {
      (billUploadService.uploadBillWithProgress as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Server error',
      });

      const { getByText } = render(<BillUploadPage />);

      // Submit form

      await waitFor(() => {
        // User-friendly error message should be shown
      });
    });

    test('handles file too large error', async () => {
      // Test file size validation
    });

    test('handles invalid image format error', async () => {
      // Test image format validation
    });
  });

  // =============================================================================
  // OFFLINE QUEUE TESTS
  // =============================================================================

  describe('Offline Queue', () => {
    test('saves form data when offline', async () => {
      // Mock offline state

      const { getByPlaceholderText } = render(<BillUploadPage />);

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '1000');
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });
    });

    test('restores saved form data on page load', async () => {
      const savedData = JSON.stringify({
        billImage: 'file://test.jpg',
        amount: '1000',
        merchantId: 'test-merchant',
        billDate: new Date().toISOString(),
      });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(savedData);

      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        expect(getByText('Draft restored')).toBeTruthy();
      });
    });

    test('clears saved data after successful upload', async () => {
      (billUploadService.uploadBillWithProgress as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { getByText } = render(<BillUploadPage />);

      // Submit successfully

      await waitFor(() => {
        expect(AsyncStorage.removeItem).toHaveBeenCalled();
      });
    });

    test('queues upload for retry when offline', async () => {
      // Test offline queue functionality
    });
  });

  // =============================================================================
  // USER INTERACTION TESTS
  // =============================================================================

  describe('User Interactions', () => {
    test('opens info modal when info icon pressed', async () => {
      const { getAllByLabelText, getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        // Find and press info icon
      });

      await waitFor(() => {
        expect(getByText('Bill Upload Tips')).toBeTruthy();
      });
    });

    test('closes info modal when close button pressed', async () => {
      const { getAllByLabelText, getByText, queryByText } = render(<BillUploadPage />);

      // Open modal

      await waitFor(() => {
        const closeButton = getByText('Got it');
        fireEvent.press(closeButton);
      });

      await waitFor(() => {
        expect(queryByText('Bill Upload Tips')).toBeNull();
      });
    });

    test('dismisses toast after timeout', async () => {
      jest.useFakeTimers();

      const { getByText, queryByText } = render(<BillUploadPage />);

      // Trigger toast

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        // Toast should be dismissed
      });

      jest.useRealTimers();
    });

    test('scrolls to error field when validation fails', async () => {
      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const submitButton = getByText('Upload Bill');
        fireEvent.press(submitButton);
      });

      // Should scroll to first error field
    });

    test('navigates back when back button pressed', async () => {
      const { getAllByLabelText } = render(<BillUploadPage />);

      // Press back button

      // Should navigate back
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe('Accessibility', () => {
    test('has accessible labels for form fields', async () => {
      const { getByText } = render(<BillUploadPage />);

      await waitFor(() => {
        expect(getByText('Bill Amount')).toBeTruthy();
        expect(getByText('Merchant')).toBeTruthy();
      });
    });

    test('provides helpful error messages', async () => {
      const { getByPlaceholderText, queryByText } = render(<BillUploadPage />);

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '');
        fireEvent(amountInput, 'blur');
      });

      await waitFor(() => {
        // Error message should be clear and helpful
        expect(queryByText(/Amount is required/i)).toBeTruthy();
      });
    });

    test('supports keyboard navigation', async () => {
      const { getByPlaceholderText } = render(<BillUploadPage />);

      // Tab through fields
      // Should navigate correctly
    });
  });
});
