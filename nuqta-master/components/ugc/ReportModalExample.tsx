/**
 * ReportModal Usage Example
 *
 * This file demonstrates how to integrate the ReportModal component
 * into your video detail screen or any other component.
 *
 * DO NOT USE THIS FILE IN PRODUCTION - IT'S JUST AN EXAMPLE
 */

import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReportModal from './ReportModal';

export default function ReportModalExample() {
  const [showReportModal, setShowReportModal] = useState(false);

  // Example video data
  const videoId = '507f1f77bcf86cd799439011'; // Replace with actual video ID
  const videoTitle = 'Amazing Product Review';

  const handleReportSuccess = () => {
    // You can show a toast notification here
    // Example: Toast.show('Report submitted. Thank you for keeping our community safe.');
  };

  return (
    <View style={styles.container}>
      {/* Report Button Example */}
      <Pressable
        style={styles.reportButton}
        onPress={() => setShowReportModal(true)}
      >
        <Ionicons name="flag-outline" size={20} color="#EF4444" />
        <Text style={styles.reportButtonText}>Report Video</Text>
      </Pressable>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        videoId={videoId}
        videoTitle={videoTitle}
        onReportSuccess={handleReportSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    gap: 8,
  },
  reportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});

/**
 * INTEGRATION NOTES:
 *
 * 1. Add report button to your video detail screen:
 *
 * ```tsx
 * import { ReportModal } from '@/components/ugc';
 *
 * function VideoDetailScreen({ video }) {
 *   const [showReportModal, setShowReportModal] = useState(false);
 *
 *   return (
 *     <View>
 *       <Pressable onPress={() => setShowReportModal(true)}>
 *         <Ionicons name="flag-outline" size={24} color="#EF4444" />
 *       </Pressable>
 *
 *       <ReportModal
 *         visible={showReportModal}
 *         onClose={() => setShowReportModal(false)}
 *         videoId={video._id}
 *         videoTitle={video.title}
 *         onReportSuccess={() => {
 *           // Handle success - show toast, etc.
 *         }}
 *       />
 *     </View>
 *   );
 * }
 * ```
 *
 * 2. The modal handles all states internally:
 *    - Loading state during submission
 *    - Error display with user-friendly messages
 *    - Success animation and auto-close
 *
 * 3. Common placement locations:
 *    - Three-dot menu in video header
 *    - Options menu in video player
 *    - Bottom sheet action list
 *
 * 4. Accessibility:
 *    - All touchable areas have proper hit slops
 *    - Text inputs support keyboard navigation
 *    - Modal can be dismissed by tapping overlay
 */
