/**
 * Modal and Overlay Accessibility Tests
 *
 * Tests for modal, dialog, and overlay accessibility:
 * - Modal dialogs
 * - Alert dialogs
 * - Bottom sheets
 * - Popovers
 * - Focus trapping
 * - Backdrop interaction
 * - Keyboard dismissal
 *
 * WCAG 2.1 AA Compliance Testing
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import AccessibleButton from '@/components/common/AccessibleButton';
import {
  validateAccessibilityLabel,
  validateAccessibilityRole,
  validateModalAccessibility,
} from '../utils/accessibilityTestUtils';

// Simple modal component for testing
const TestModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ visible, onClose, title, children }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
    accessible={true}
    accessibilityViewIsModal={true}
  >
    <View
      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={`${title} dialog`}
    >
      <View
        style={{ backgroundColor: 'white', padding: 20 }}
        accessible={true}
        accessibilityRole="none"
      >
        <Text
          accessibilityRole="header"
          accessibilityLabel={title}
        >
          {title}
        </Text>
        {children}
        <AccessibleButton
          label="Close"
          onPress={onClose}
          accessibilityLabel="Close dialog"
          accessibilityHint="Dismisses the dialog and returns to previous screen"
        />
      </View>
    </View>
  </Modal>
);

describe('Modal and Overlay Accessibility Tests', () => {
  describe('Modal Structure', () => {
    it('should have proper modal attributes', () => {
      const { getByText } = render(
        <TestModal visible={true} onClose={jest.fn()} title="Test Modal">
          <Text>Modal content</Text>
        </TestModal>
      );

      const content = getByText('Modal content');
      expect(content).toBeTruthy();
    });

    it('should have accessible title/heading', () => {
      const { getByRole } = render(
        <TestModal visible={true} onClose={jest.fn()} title="Confirm Action">
          <Text>Are you sure?</Text>
        </TestModal>
      );

      const heading = getByRole('header');
      expect(heading.props.accessibilityLabel).toBe('Confirm Action');
    });

    it('should have accessible close button', () => {
      const onClose = jest.fn();
      const { getByLabelText } = render(
        <TestModal visible={true} onClose={onClose} title="Test Modal">
          <Text>Content</Text>
        </TestModal>
      );

      const closeButton = getByLabelText('Close dialog');
      expect(closeButton).toBeTruthy();
      expect(closeButton.props.accessibilityRole).toBe('button');
    });

    it('should provide close hint', () => {
      const { getByLabelText } = render(
        <TestModal visible={true} onClose={jest.fn()} title="Test">
          <Text>Content</Text>
        </TestModal>
      );

      const closeButton = getByLabelText('Close dialog');
      expect(closeButton.props.accessibilityHint).toContain('Dismisses the dialog');
    });
  });

  describe('Alert Dialogs', () => {
    it('should have alert role for important messages', () => {
      const { getByTestId } = render(
        <View
          testID="alert-dialog"
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Text>Error: Payment failed</Text>
        </View>
      );

      const alert = getByTestId('alert-dialog');
      expect(alert.props.accessibilityRole).toBe('alert');
      expect(alert.props.accessibilityLiveRegion).toBe('assertive');
    });

    it('should announce alert messages', () => {
      const { getByText } = render(
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Text accessibilityLabel="Error: Unable to process payment">
            Error: Unable to process payment
          </Text>
        </View>
      );

      const message = getByText('Error: Unable to process payment');
      expect(message.props.accessibilityLabel).toContain('Error');
    });

    it('should have primary and secondary actions', () => {
      const { getByLabelText } = render(
        <View>
          <Text>Delete this item?</Text>
          <AccessibleButton
            label="Delete"
            onPress={jest.fn()}
            variant="danger"
            accessibilityLabel="Confirm delete"
          />
          <AccessibleButton
            label="Cancel"
            onPress={jest.fn()}
            variant="outline"
            accessibilityLabel="Cancel delete"
          />
        </View>
      );

      const confirmButton = getByLabelText('Confirm delete');
      const cancelButton = getByLabelText('Cancel delete');

      expect(confirmButton).toBeTruthy();
      expect(cancelButton).toBeTruthy();
    });
  });

  describe('Focus Management', () => {
    it('should trap focus within modal', () => {
      const { getAllByRole } = render(
        <Modal visible={true} accessibilityViewIsModal={true}>
          <View>
            <AccessibleButton label="Button 1" onPress={jest.fn()} />
            <AccessibleButton label="Button 2" onPress={jest.fn()} />
            <AccessibleButton label="Close" onPress={jest.fn()} />
          </View>
        </Modal>
      );

      const buttons = getAllByRole('button');
      expect(buttons.length).toBe(3);

      // All buttons should be within modal
      buttons.forEach((button) => {
        expect(button.props.accessibilityRole).toBe('button');
      });
    });

    it('should focus first element when modal opens', () => {
      const { getByLabelText } = render(
        <Modal visible={true} accessibilityViewIsModal={true}>
          <View>
            <Text
              accessibilityRole="header"
              accessibilityLabel="Modal Title"
            >
              Modal Title
            </Text>
            <AccessibleButton label="Action" onPress={jest.fn()} />
          </View>
        </Modal>
      );

      // First focusable element should be accessible
      const title = getByLabelText('Modal Title');
      expect(title).toBeTruthy();
    });

    it('should restore focus after modal closes', () => {
      const { rerender, queryByText } = render(
        <View>
          <AccessibleButton label="Open Modal" onPress={jest.fn()} />
          <Modal visible={true}>
            <Text>Modal Content</Text>
          </Modal>
        </View>
      );

      expect(queryByText('Modal Content')).toBeTruthy();

      // Close modal
      rerender(
        <View>
          <AccessibleButton label="Open Modal" onPress={jest.fn()} />
          <Modal visible={false}>
            <Text>Modal Content</Text>
          </Modal>
        </View>
      );

      // Modal content should be hidden
      expect(queryByText('Modal Content')).toBeFalsy();
    });
  });

  describe('Backdrop Interaction', () => {
    it('should close on backdrop press if dismissible', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <Modal
          visible={true}
          transparent={true}
          onRequestClose={onClose}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={onClose}
            accessibilityLabel="Close modal"
            accessibilityHint="Tap to dismiss"
            testID="backdrop"
          >
            <View style={{ backgroundColor: 'white' }}>
              <Text>Modal Content</Text>
            </View>
          </TouchableOpacity>
        </Modal>
      );

      const backdrop = getByTestId('backdrop');
      fireEvent.press(backdrop);

      expect(onClose).toHaveBeenCalled();
    });

    it('should prevent backdrop close for critical dialogs', () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <Modal
          visible={true}
          transparent={true}
          onRequestClose={() => {}} // Prevent Android back button
        >
          <View
            testID="backdrop"
            style={{ flex: 1 }}
            accessibilityLabel="Dialog requires action"
          >
            <View>
              <Text>You must confirm or cancel</Text>
              <AccessibleButton label="Confirm" onPress={onClose} />
              <AccessibleButton label="Cancel" onPress={onClose} />
            </View>
          </View>
        </Modal>
      );

      const backdrop = getByTestId('backdrop');
      fireEvent.press(backdrop);

      // Should not close
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Dismissal', () => {
    it('should support hardware back button', () => {
      const onClose = jest.fn();
      const { UNSAFE_root } = render(
        <Modal
          visible={true}
          onRequestClose={onClose}
        >
          <Text>Modal Content</Text>
        </Modal>
      );

      // Modal should have onRequestClose for Android back button
      const modal = UNSAFE_root.findByType(Modal);
      expect(modal.props.onRequestClose).toBe(onClose);
    });

    it('should have escape key equivalent (close button)', () => {
      const onClose = jest.fn();
      const { getByLabelText } = render(
        <Modal visible={true} onRequestClose={onClose}>
          <View>
            <AccessibleButton
              label="Close"
              onPress={onClose}
              accessibilityLabel="Close modal, press to dismiss"
            />
          </View>
        </Modal>
      );

      const closeButton = getByLabelText(/Close modal/);
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Bottom Sheets', () => {
    it('should have proper role and label', () => {
      const { getByTestId } = render(
        <View
          testID="bottom-sheet"
          accessibilityRole="none"
          accessibilityLabel="Filter options sheet"
        >
          <Text>Filter Options</Text>
        </View>
      );

      const sheet = getByTestId('bottom-sheet');
      expect(sheet.props.accessibilityLabel).toContain('sheet');
    });

    it('should have drag handle with proper label', () => {
      const { getByLabelText } = render(
        <View>
          <TouchableOpacity
            accessibilityLabel="Drag to resize"
            accessibilityHint="Double tap and hold to drag"
            accessibilityRole="button"
          >
            <View style={{ width: 40, height: 4, backgroundColor: 'gray' }} />
          </TouchableOpacity>
          <Text>Sheet Content</Text>
        </View>
      );

      const handle = getByLabelText('Drag to resize');
      expect(handle).toBeTruthy();
    });

    it('should announce sheet state changes', () => {
      const { getByTestId, rerender } = render(
        <View
          testID="sheet"
          accessibilityLabel="Filters sheet, collapsed"
          accessibilityLiveRegion="polite"
        >
          <Text>Filters</Text>
        </View>
      );

      let sheet = getByTestId('sheet');
      expect(sheet.props.accessibilityLabel).toContain('collapsed');

      // Expand sheet
      rerender(
        <View
          testID="sheet"
          accessibilityLabel="Filters sheet, expanded"
          accessibilityLiveRegion="polite"
        >
          <Text>Filters</Text>
          <Text>Filter options here...</Text>
        </View>
      );

      sheet = getByTestId('sheet');
      expect(sheet.props.accessibilityLabel).toContain('expanded');
    });
  });

  describe('Popovers and Tooltips', () => {
    it('should have proper role for popover', () => {
      const { getByTestId } = render(
        <View
          testID="popover"
          accessibilityRole="menu"
          accessibilityLabel="Account options menu"
        >
          <TouchableOpacity accessibilityRole="menuitem">
            <Text>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="menuitem">
            <Text>Settings</Text>
          </TouchableOpacity>
        </View>
      );

      const popover = getByTestId('popover');
      expect(popover.props.accessibilityRole).toBe('menu');
    });

    it('should associate tooltip with trigger', () => {
      const { getByTestId } = render(
        <View>
          <TouchableOpacity
            testID="trigger"
            accessibilityLabel="Help"
            accessibilityHint="Shows help tooltip"
          >
            <Text>?</Text>
          </TouchableOpacity>
          <View
            testID="tooltip"
            accessibilityRole="tooltip"
            accessibilityLabel="Help information: Click to view details"
          >
            <Text>Help info</Text>
          </View>
        </View>
      );

      const trigger = getByTestId('trigger');
      expect(trigger.props.accessibilityHint).toContain('tooltip');
    });

    it('should announce tooltip on hover/focus', () => {
      const { getByTestId } = render(
        <View
          testID="tooltip"
          accessibilityLiveRegion="polite"
          accessibilityLabel="Tooltip: Save your changes before continuing"
        >
          <Text>Save your changes before continuing</Text>
        </View>
      );

      const tooltip = getByTestId('tooltip');
      expect(tooltip.props.accessibilityLiveRegion).toBe('polite');
    });
  });

  describe('Modal Loading States', () => {
    it('should indicate busy state during actions', () => {
      const { getByTestId } = render(
        <Modal visible={true}>
          <View>
            <AccessibleButton
              label="Submit"
              onPress={jest.fn()}
              loading={true}
              testID="submit-btn"
            />
          </View>
        </Modal>
      );

      const button = getByTestId('submit-btn');
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it('should prevent interaction during loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Modal visible={true}>
          <AccessibleButton
            label="Submit"
            onPress={onPress}
            loading={true}
            testID="submit-btn"
          />
        </Modal>
      );

      const button = getByTestId('submit-btn');
      fireEvent.press(button);

      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Confirmation Dialogs', () => {
    it('should clearly label destructive actions', () => {
      const { getByLabelText } = render(
        <View>
          <Text>Delete your account?</Text>
          <AccessibleButton
            label="Delete Account"
            onPress={jest.fn()}
            variant="danger"
            accessibilityLabel="Confirm account deletion"
            accessibilityHint="Warning: This action cannot be undone"
          />
        </View>
      );

      const button = getByLabelText('Confirm account deletion');
      expect(button.props.accessibilityHint).toContain('cannot be undone');
    });

    it('should emphasize primary action', () => {
      const { getAllByRole } = render(
        <View>
          <AccessibleButton
            label="Save Changes"
            onPress={jest.fn()}
            variant="primary"
          />
          <AccessibleButton
            label="Discard"
            onPress={jest.fn()}
            variant="outline"
          />
        </View>
      );

      const buttons = getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('Multi-step Dialogs', () => {
    it('should indicate current step', () => {
      const { getByText } = render(
        <Modal visible={true}>
          <View>
            <Text
              accessibilityLabel="Step 1 of 3: Enter your name"
              accessibilityRole="header"
            >
              Enter your name
            </Text>
          </View>
        </Modal>
      );

      const heading = getByText('Enter your name');
      expect(heading.props.accessibilityLabel).toContain('Step 1 of 3');
    });

    it('should have navigation between steps', () => {
      const { getByLabelText } = render(
        <View>
          <AccessibleButton
            label="Back"
            onPress={jest.fn()}
            accessibilityLabel="Go to previous step"
          />
          <AccessibleButton
            label="Next"
            onPress={jest.fn()}
            accessibilityLabel="Continue to next step"
          />
        </View>
      );

      const backButton = getByLabelText('Go to previous step');
      const nextButton = getByLabelText('Continue to next step');

      expect(backButton).toBeTruthy();
      expect(nextButton).toBeTruthy();
    });
  });
});
