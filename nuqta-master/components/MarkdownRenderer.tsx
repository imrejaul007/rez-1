// Lightweight markdown renderer - replaces react-native-markdown-display (~280KB)
// Supports: headings, paragraphs, bold, italic, code blocks, inline code, lists, blockquotes, links
import React from 'react';
import { View, Text, StyleSheet, Platform, Linking } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';

interface MarkdownRendererProps {
  content: string;
}

// Simple markdown parser
function parseMarkdown(text: string): Array<{ type: string; content: string; language?: string }> {
  const lines = text.split('\n');
  const elements: Array<{ type: string; content: string; language?: string }> = [];
  let inCodeBlock = false;
  let codeContent = '';
  let codeLanguage = '';
  let inList = false;
  let listContent: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listContent.length > 0) {
      elements.push({ type: listType!, content: listContent.join('\n') });
      listContent = [];
      listType = null;
      inList = false;
    }
  };

  for (const line of lines) {
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push({ type: 'code_block', content: codeContent.trim(), language: codeLanguage });
        codeContent = '';
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    // Headings
    const h1Match = line.match(/^#\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);

    if (h1Match) {
      flushList();
      elements.push({ type: 'heading1', content: h1Match[1] });
      continue;
    }
    if (h2Match) {
      flushList();
      elements.push({ type: 'heading2', content: h2Match[1] });
      continue;
    }
    if (h3Match) {
      flushList();
      elements.push({ type: 'heading3', content: h3Match[1] });
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      flushList();
      elements.push({ type: 'blockquote', content: line.slice(2) });
      continue;
    }

    // Lists
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    const olMatch = line.match(/^\d+\.\s+(.+)$/);

    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      listContent.push(ulMatch[1]);
      continue;
    }
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
      }
      listContent.push(olMatch[1]);
      continue;
    }

    // Empty lines break lists
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // Paragraphs
    flushList();
    elements.push({ type: 'paragraph', content: line });
  }

  flushList();
  return elements;
}

// Parse inline elements (bold, italic, code, links)
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <Text key={parts.length} style={styles.code_inline}>
          {codeMatch[1]}
        </Text>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(
        <Text key={parts.length} style={styles.strong}>
          {boldMatch[1]}
        </Text>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      parts.push(
        <Text key={parts.length} style={styles.em}>
          {italicMatch[1]}
        </Text>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Links [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push(
        <Text
          key={parts.length}
          style={styles.link}
          onPress={() => Linking.openURL(linkMatch[2])}
        >
          {linkMatch[1]}
        </Text>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Regular text - take one character at a time to find next special
    const nextSpecial = remaining.search(/[`*[]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts;
}

const styles = StyleSheet.create({
  heading1: {
    color: Colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 16,
    lineHeight: 36,
  },
  heading2: {
    color: Colors.text.primary,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 14,
    lineHeight: 32,
  },
  heading3: {
    color: Colors.text.secondary,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
    lineHeight: 28,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 16,
    color: Colors.text.secondary,
    fontSize: 17,
    lineHeight: 28,
  },
  strong: {
    fontWeight: '700',
    color: Colors.text.primary,
  },
  em: {
    fontStyle: 'italic',
  },
  list_item: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  list_bullet: {
    color: Colors.brand.purpleLight,
    fontSize: 20,
    lineHeight: 28,
    marginRight: 8,
    fontWeight: '700',
  },
  blockquote: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.brand.purpleLight,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 16,
    borderRadius: BorderRadius.sm,
  },
  blockquote_text: {
    color: Colors.text.secondary,
    fontSize: 17,
    lineHeight: 28,
    fontStyle: 'italic',
  },
  code_inline: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    color: Colors.brand.purpleLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  code_block: {
    backgroundColor: Colors.text.primary,
    color: Colors.background.secondary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  link: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
});

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const elements = parseMarkdown(content);

  return (
    <View>
      {elements.map((element, index) => {
        switch (element.type) {
          case 'heading1':
            return (
              <Text key={index} style={styles.heading1}>
                {parseInline(element.content)}
              </Text>
            );
          case 'heading2':
            return (
              <Text key={index} style={styles.heading2}>
                {parseInline(element.content)}
              </Text>
            );
          case 'heading3':
            return (
              <Text key={index} style={styles.heading3}>
                {parseInline(element.content)}
              </Text>
            );
          case 'paragraph':
            return (
              <Text key={index} style={styles.paragraph}>
                {parseInline(element.content)}
              </Text>
            );
          case 'ul':
            return (
              <View key={index} style={{ marginBottom: 16 }}>
                {element.content.split('\n').map((item, i) => (
                  <View key={i} style={styles.list_item}>
                    <Text style={styles.list_bullet}>•</Text>
                    <Text style={[styles.paragraph, { marginBottom: 0, flex: 1 }]}>
                      {parseInline(item)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'ol':
            return (
              <View key={index} style={{ marginBottom: 16 }}>
                {element.content.split('\n').map((item, i) => (
                  <View key={i} style={styles.list_item}>
                    <Text style={styles.list_bullet}>{i + 1}.</Text>
                    <Text style={[styles.paragraph, { marginBottom: 0, flex: 1 }]}>
                      {parseInline(item)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'blockquote':
            return (
              <View key={index} style={styles.blockquote}>
                <Text style={styles.blockquote_text}>{element.content}</Text>
              </View>
            );
          case 'code_block':
            return (
              <View key={index} style={styles.code_block}>
                <Text style={{ color: Colors.background.secondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14 }}>
                  {element.content}
                </Text>
              </View>
            );
          default:
            return null;
        }
      })}
    </View>
  );
}
