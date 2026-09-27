import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Switch, TouchableOpacity, Alert } from 'react-native';
import { normalizeFont, MAX_FONT_SCALE, getSafeFontSize, willTextClip } from '../config/fontScaling';

export default function FontScalingTestScreen() {
  const [maxScaleEnabled, setMaxScaleEnabled] = React.useState(false);
  const [results, setResults] = React.useState<any[]>([]);

  const runTests = () => {
    const testResults: any[] = [];
    
    const testCases = [
      { text: 'Hunty', fontSize: 24, type: 'Title' },
      { text: 'City Secrets', fontSize: 20, type: 'Hunt Title' },
      { text: 'Race across town to uncover hidden murals and landmarks.', fontSize: 16, type: 'Description' },
      { text: 'Start Hunt', fontSize: 16, type: 'Button' },
      { text: 'Play Now', fontSize: 14, type: 'Button' },
      { text: 'Leaderboard', fontSize: 18, type: 'Navigation' },
      { text: 'Dashboard', fontSize: 18, type: 'Navigation' },
      { text: 'Profile', fontSize: 16, type: 'Navigation' },
      { text: 'Settings', fontSize: 16, type: 'Navigation' },
      { text: 'Help & Support', fontSize: 14, type: 'Navigation' },
    ];

    const currentMaxScale = maxScaleEnabled ? MAX_FONT_SCALE : 1.0;

    testCases.forEach(({ text, fontSize, type }) => {
      const scaledFontSize = normalizeFont(fontSize * currentMaxScale);
      const willClip = willTextClip(text, fontSize, 300);
      const safeFontSize = getSafeFontSize(300, text, fontSize);

      testResults.push({
        type,
        text,
        originalSize: fontSize,
        scaledSize: scaledFontSize,
        willClip,
        safeFontSize,
      });
    });

    setResults(testResults);
    
    // Check for critical issues
    const criticalIssues = testResults.filter(r => r.willClip);
    if (criticalIssues.length > 0) {
      Alert.alert(
        'Font Scaling Issues Detected',
        `${criticalIssues.length} text elements may clip at maximum font scaling. See results for details.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Font Scaling Test Complete',
        'All text elements passed the scaling test.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Font Scaling Test</Text>
        <Text style={styles.subtitle}>
          Platform: {Platform.OS.toUpperCase()} | Max Scale: {maxScaleEnabled ? MAX_FONT_SCALE.toFixed(1) : '1.0'}
        </Text>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Enable Maximum Font Scaling</Text>
          <Switch
            value={maxScaleEnabled}
            onValueChange={setMaxScaleEnabled}
            trackColor={{ false: '#767577', true: '#81b6ff' }}
            thumbColor={maxScaleEnabled ? '#0a84ff' : '#f4f3f4'}
          />
        </View>
        <TouchableOpacity style={styles.testButton} onPress={runTests}>
          <Text style={styles.testButtonText}>Run Font Scaling Test</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {results.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultType}>{result.type}</Text>
              <Text style={styles.resultText}>{result.text}</Text>
            </View>
            <View style={styles.resultDetails}>
              <Text style={styles.detailText}>
                Original: {result.originalSize}pt → Scaled: {result.scaledSize.toFixed(1)}pt
              </Text>
              {result.willClip && (
                <Text style={styles.warning}>⚠️ Text may clip at max scale</Text>
              )}
              <Text style={styles.safeSize}>
                Safe Font Size: {result.safeFontSize.toFixed(1)}pt
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sampleTexts}>
        <Text style={styles.sectionTitle}>Sample Text at Normal Scale:</Text>
        <Text style={styles.sampleText}>Hunty - Title Text</Text>
        <Text style={styles.sampleText}>City Secrets - Hunt Title</Text>
        <Text style={styles.sampleText}>
          Race across town to uncover hidden murals and landmarks.
        </Text>
        <View style={styles.sampleButton}>Start Hunt</View>
        <View style={styles.sampleButton}>Play Now</View>

        <Text style={styles.sectionTitle}>Sample Text at Maximum Scale:</Text>
        <Text style={[styles.sampleText, { fontSize: normalizeFont(24 * MAX_FONT_SCALE) }]}>
          Hunty - Title Text
        </Text>
        <Text style={[styles.sampleText, { fontSize: normalizeFont(20 * MAX_FONT_SCALE) }]}>
          City Secrets - Hunt Title
        </Text>
        <Text style={[styles.sampleText, { fontSize: normalizeFont(16 * MAX_FONT_SCALE) }]}>
          Race across town to uncover hidden murals and landmarks.
        </Text>
        <Text style={[styles.sampleButton, { fontSize: normalizeFont(16 * MAX_FONT_SCALE) }]}>Start Hunt</Text>
        <Text style={[styles.sampleButton, { fontSize: normalizeFont(14 * MAX_FONT_SCALE) }]}>Play Now</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  toggleLabel: {
    fontSize: 16,
  },
  testButton: {
    backgroundColor: '#0a84ff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  resultItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  resultHeader: {
    marginBottom: 10,
  },
  resultType: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultDetails: {
    gap: 5,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  warning: {
    fontSize: 12,
    color: '#ff9500',
  },
  safeSize: {
    fontSize: 12,
    color: '#34c759',
  },
  sampleTexts: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  sampleText: {
    fontSize: 16,
    marginBottom: 10,
  },
  sampleButton: {
    fontSize: 16,
    fontWeight: '600',
    padding: 10,
    backgroundColor: '#0a84ff',
    color: '#fff',
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: 10,
  },
});
