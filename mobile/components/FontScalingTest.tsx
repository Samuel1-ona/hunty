import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Switch, TouchableOpacity } from 'react-native';
import { normalizeFont, getMaxFontScale, getSafeFontSize } from '../utils/fontScaling';

interface FontScalingTestProps {
  isTesting: boolean;
  onTestComplete: (results: TestResult[]) => void;
}

interface TestResult {
  component: string;
  fontSize: number;
  maxFontSize: number;
  willClip: boolean;
  safeFontSize: number;
}

export default function FontScalingTest({ isTesting, onTestComplete }: FontScalingTestProps) {
  const [results, setResults] = React.useState<TestResult[]>([]);
  const [maxScaleEnabled, setMaxScaleEnabled] = React.useState(false);

  React.useEffect(() => {
    if (isTesting) {
      runTests();
    }
  }, [isTesting, maxScaleEnabled]);

  const runTests = async () => {
    const testResults: TestResult[] = [];
    
    // Test various text components at maximum font scaling
    const testCases = [
      { text: 'Hunty', fontSize: 24 },
      { text: 'City Secrets', fontSize: 20 },
      { text: 'Race across town to uncover hidden murals and landmarks.', fontSize: 16 },
      { text: 'Start Hunt', fontSize: 16 },
      { text: 'Play Now', fontSize: 14 },
      { text: 'Leaderboard', fontSize: 18 },
      { text: 'Dashboard', fontSize: 18 },
      { text: 'Profile', fontSize: 16 },
      { text: 'Settings', fontSize: 16 },
      { text: 'Help & Support', fontSize: 14 },
    ];

    const currentMaxScale = maxScaleEnabled ? getMaxFontScale() : 1.0;

    testCases.forEach(({ text, fontSize }) => {
      const scaledFontSize = normalizeFont(fontSize * currentMaxScale);
      const willClip = text.length * scaledFontSize * 0.6 > 300; // Assuming 300px max width
      const safeFontSize = getSafeFontSize(300, text);

      testResults.push({
        component: text,
        fontSize,
        maxFontSize: scaledFontSize,
        willClip,
        safeFontSize,
      });
    });

    setResults(testResults);
    onTestComplete(testResults);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Font Scaling Test</Text>
        <Text style={styles.subtitle}>
          Current Max Scale: {maxScaleEnabled ? getMaxFontScale().toFixed(1) : '1.0'}
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
      </View>

      <View style={styles.testResults}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {results.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={styles.resultText}>{result.component}</Text>
            <Text style={styles.resultDetails}>
              Original: {result.fontSize}pt → Scaled: {result.maxFontSize.toFixed(1)}pt
            </Text>
            {result.willClip && (
              <Text style={styles.warning}>⚠️ Warning: Text may clip at max scale</Text>
            )}
            <Text style={styles.safeSize}>
              Safe Font Size: {result.safeFontSize.toFixed(1)}pt
            </Text>
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
        <Text style={styles.sampleButton}>Start Hunt</Text>
        <Text style={styles.sampleButton}>Play Now</Text>

        <Text style={styles.sectionTitle}>Sample Text at Maximum Scale:</Text>
        <Text style={[styles.sampleText, { fontSize: normalizeFont(24 * getMaxFontScale()) }]}>
          Hunty - Title Text
        </Text>
        <Text style={[styles.sampleText, { fontSize: normalizeFont(20 * getMaxFontScale()) }]}>
          City Secrets - Hunt Title
        </Text>
        <Text style={[styles.sampleText, { fontSize: normalizeFont(16 * getMaxFontScale()) }]}>
          Race across town to uncover hidden murals and landmarks.
        </Text>
        <Text style={[styles.sampleButton, { fontSize: normalizeFont(16 * getMaxFontScale()) }]}>
          Start Hunt
        </Text>
        <Text style={[styles.sampleButton, { fontSize: normalizeFont(14 * getMaxFontScale()) }]}>
          Play Now
        </Text>
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
  },
  toggleLabel: {
    fontSize: 16,
  },
  testResults: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  resultItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  resultDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  warning: {
    fontSize: 12,
    color: '#ff9500',
    marginBottom: 5,
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
