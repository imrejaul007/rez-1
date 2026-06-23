/**
 * BillCamera - Camera capture section for bill upload
 *
 * Renders the full-screen camera view with capture button,
 * flip camera toggle, and framing guidelines.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as ExpoCamera from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface BillCameraProps {
  cameraRef: React.RefObject<ExpoCamera.CameraView>;
  cameraType: 'back' | 'front';
  onCapture: () => void;
  onClose: () => void;
  onFlipCamera: () => void;
}

const BillCamera = React.memo(function BillCamera({
  cameraRef,
  cameraType,
  onCapture,
  onClose,
  onFlipCamera,
}: BillCameraProps) {
  return (
    <View style={styles.cameraContainer}>
      <ExpoCamera.CameraView ref={cameraRef} style={styles.camera} facing={cameraType}>
        <View style={styles.cameraOverlay}>
          {/* Close button */}
          <Pressable style={styles.cameraCloseButton} onPress={onClose}>
            <Ionicons name="close" size={32} color={Colors.text.inverse} />
          </Pressable>

          {/* Guidelines */}
          <View style={styles.cameraGuidelines}>
            <Text style={styles.cameraGuidelinesText}>
              Position the bill within the frame
            </Text>
            <View style={styles.cameraFrame} />
            <Text style={styles.cameraHelperText}>
              Ensure all details are visible and well-lit
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.cameraControls}>
            <Pressable style={styles.cameraFlipButton} onPress={onFlipCamera}>
              <Ionicons name="camera-reverse" size={32} color={Colors.text.inverse} />
            </Pressable>

            <Pressable style={styles.cameraCaptureButton} onPress={onCapture}>
              <View style={styles.cameraCaptureButtonInner} />
            </Pressable>

            <View style={{ width: 60 }} />
          </View>
        </View>
      </ExpoCamera.CameraView>
    </View>
  );
});

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraCloseButton: {
    position: 'absolute',
    top: 50,
    right: Spacing.lg,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
  },
  cameraGuidelines: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  cameraGuidelinesText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginBottom: Spacing.lg,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
      web: {
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.75)',
      },
    }),
  },
  cameraFrame: {
    width: 300,
    height: 200,
    borderWidth: 3,
    borderColor: Colors.text.inverse,
    borderRadius: BorderRadius.md,
  },
  cameraHelperText: {
    color: Colors.text.inverse,
    ...Typography.body,
    marginTop: Spacing.md,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.75)',
      },
    }),
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 50,
  },
  cameraFlipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brand.green,
  },
});

export default BillCamera;
