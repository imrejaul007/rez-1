// Message Input Component
// Text input with send button and attachment options

import { colors } from '@/constants/theme';
import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { PROFILE_COLORS } from '@/types/profile.types';

interface MessageInputProps {
  onSend: (message: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  onAttachImage?: () => void;
  onAttachFile?: () => void;
  placeholder?: string;
  disabled?: boolean;
  prefilledMessage?: string;
}

function MessageInput({
  onSend,
  onTyping,
  onStopTyping,
  onAttachImage,
  onAttachFile,
  placeholder = 'Type a message...',
  disabled = false,
  prefilledMessage,
}: MessageInputProps) {
  const [message, setMessage] = useState(prefilledMessage || '');
  const [showAttachments, setShowAttachments] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTextChange = (text: string) => {
    setMessage(text);

    // Trigger typing indicator
    if (onTyping && text.length > 0) {
      onTyping();

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping?.();
      }, 2000);
    } else if (text.length === 0) {
      onStopTyping?.();
    }
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    onSend(trimmedMessage);
    setMessage('');
    onStopTyping?.();

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Reset keyboard
    inputRef.current?.focus();
  };

  const toggleAttachments = () => {
    setShowAttachments(!showAttachments);
  };

  const handleAttachImage = () => {
    setShowAttachments(false);
    onAttachImage?.();
  };

  const handleAttachFile = () => {
    setShowAttachments(false);
    onAttachFile?.();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        {/* Attachment Options */}
        {showAttachments && (
          <View style={styles.attachmentOptions}>
            {onAttachImage && (
              <Pressable
                style={styles.attachmentOption}
                onPress={handleAttachImage}
              >
                <View style={[styles.attachmentIconContainer, { backgroundColor: PROFILE_COLORS.primary + '20' }]}>
                  <Ionicons name="image" size={24} color={PROFILE_COLORS.primary} />
                </View>
                <ThemedText style={styles.attachmentOptionText}>Photo</ThemedText>
              </Pressable>
            )}

            {onAttachFile && (
              <Pressable
                style={styles.attachmentOption}
                onPress={handleAttachFile}
              >
                <View style={[styles.attachmentIconContainer, { backgroundColor: PROFILE_COLORS.secondary + '20' }]}>
                  <Ionicons name="document-attach" size={24} color={PROFILE_COLORS.secondary} />
                </View>
                <ThemedText style={styles.attachmentOptionText}>File</ThemedText>
              </Pressable>
            )}

            <Pressable
              style={styles.attachmentOption}
              onPress={() => {
                setShowAttachments(false);
                platformAlertSimple('Coming Soon', 'Location sharing feature will be available soon');
              }}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: PROFILE_COLORS.success + '20' }]}>
                <Ionicons name="location" size={24} color={PROFILE_COLORS.success} />
              </View>
              <ThemedText style={styles.attachmentOptionText}>Location</ThemedText>
            </Pressable>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          {/* Attachment Button */}
          <Pressable
            style={styles.attachButton}
            onPress={toggleAttachments}
            disabled={disabled}
          >
            <Ionicons
              name={showAttachments ? 'close' : 'add-circle'}
              size={28}
              color={showAttachments ? PROFILE_COLORS.error : PROFILE_COLORS.primary}
            />
          </Pressable>

          {/* Text Input */}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#999"
            value={message}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
            editable={!disabled}
            autoFocus={!!prefilledMessage}
          />

          {/* Send Button */}
          <Pressable
            style={[
              styles.sendButton,
              (!message.trim() || disabled) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!message.trim() || disabled}
          >
            <Ionicons
              name="send"
              size={20}
              color={message.trim() && !disabled ? 'white' : '#999'}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  attachmentOptions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 16,
  },
  attachmentOption: {
    alignItems: 'center',
    gap: 4,
  },
  attachmentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentOptionText: {
    fontSize: 12,
    color: colors.midGray,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
  },
  attachButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    fontSize: 15,
    maxHeight: 100,
    color: colors.darkGray,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PROFILE_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
});

export default React.memo(MessageInput);
