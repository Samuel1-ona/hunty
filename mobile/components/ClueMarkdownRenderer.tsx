import React from 'react';
import { StyleSheet, View, Text, Linking, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@providers/ThemeProvider';
import { resolveImageSrc } from '@lib/ipfs';

interface ClueMarkdownRendererProps {
  text: string;
}

export function ClueMarkdownRenderer({ text }: ClueMarkdownRendererProps) {
  const { colors } = useTheme();

  if (!text) return null;

  // Split content by markdown images first: /(!\[.*?\]\(.*?\))/g
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);

  return (
    <View style={styles.container}>
      {parts.map((part, index) => {
        const imageMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
        if (imageMatch) {
          const altText = imageMatch[1];
          const imageUri = imageMatch[2];
          const resolvedSrc = resolveImageSrc(imageUri);

          return (
            <View key={`img-${index}`} style={styles.imageWrapper}>
              <Image
                source={{ uri: resolvedSrc }}
                style={[styles.image, { borderColor: colors.border }]}
                contentFit="cover"
                accessibilityLabel={altText || 'Clue image'}
              />
              {altText ? (
                <Text style={[styles.caption, { color: colors.secondary }]}>
                  {altText}
                </Text>
              ) : null}
            </View>
          );
        }

        // Inline formatting: parse bold and links
        return renderFormattedText(part, index, colors);
      })}
    </View>
  );
}

function renderFormattedText(text: string, key: number, colors: any) {
  if (!text) return null;

  // Split by markdown links: /(\[.*?\]\(.*?\))/g
  const subParts = text.split(/(\[.*?\]\(.*?\))/g);

  const elements = subParts.map((subPart, subIdx) => {
    const linkMatch = subPart.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      const linkLabel = linkMatch[1];
      const linkUrl = linkMatch[2];

      const handlePress = async () => {
        try {
          const canOpen = await Linking.canOpenURL(linkUrl);
          if (canOpen) {
            await Linking.openURL(linkUrl);
          }
        } catch (error) {
          if (__DEV__) {
            console.warn(`Cannot open URL: ${linkUrl}`, error);
          }
        }
      };

      return (
        <Text
          key={`link-${subIdx}`}
          style={[styles.link, { color: colors.primary }]}
          onPress={handlePress}
        >
          {renderBoldText(linkLabel)}
        </Text>
      );
    }

    return (
      <React.Fragment key={`text-${subIdx}`}>
        {renderBoldText(subPart)}
      </React.Fragment>
    );
  });

  return (
    <Text key={`formatted-${key}`} style={[styles.paragraph, { color: colors.text }]}>
      {elements}
    </Text>
  );
}

function renderBoldText(text: string) {
  if (!text) return '';

  // Split by bold syntaxes: **bold** or __bold__
  const boldParts = text.split(/(\*\*.*?\*\*|__.*?__)/g);

  return boldParts.map((part, index) => {
    const isBold =
      (part.startsWith('**') && part.endsWith('**')) ||
      (part.startsWith('__') && part.endsWith('__'));

    if (isBold) {
      const cleanText = part.slice(2, -2);
      return (
        <Text key={`bold-${index}`} style={styles.bold}>
          {cleanText}
        </Text>
      );
    }

    return part;
  });
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  bold: {
    fontWeight: '700',
  },
  link: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  imageWrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
  },
  caption: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
