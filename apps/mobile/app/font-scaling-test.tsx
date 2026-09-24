import React from "react"
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native"

import { getSafeFontSize, MAX_FONT_SCALE, normalizeFont, willTextClip } from "../config/fontScaling"

type TestResult = {
  type: string
  text: string
  originalSize: number
  scaledSize: number
  willClip: boolean
  safeFontSize: number
}

export default function FontScalingTestScreen() {
  const [maxScaleEnabled, setMaxScaleEnabled] = React.useState(false)
  const [results, setResults] = React.useState<TestResult[]>([])

  const runTests = () => {
    const testResults: TestResult[] = []
    const testCases = [
      { text: "Hunty", fontSize: 24, type: "Title" },
      { text: "City Secrets", fontSize: 20, type: "Hunt Title" },
      { text: "Race across town to uncover hidden murals and landmarks.", fontSize: 16, type: "Description" },
      { text: "Start Hunt", fontSize: 16, type: "Button" },
      { text: "Play Now", fontSize: 14, type: "Button" },
      { text: "Leaderboard", fontSize: 18, type: "Navigation" },
      { text: "Dashboard", fontSize: 18, type: "Navigation" },
      { text: "Profile", fontSize: 16, type: "Navigation" },
      { text: "Settings", fontSize: 16, type: "Navigation" },
      { text: "Help & Support", fontSize: 14, type: "Navigation" },
    ]

    const currentMaxScale = maxScaleEnabled ? MAX_FONT_SCALE : 1.0

    testCases.forEach(({ text, fontSize, type }) => {
      testResults.push({
        type,
        text,
        originalSize: fontSize,
        scaledSize: normalizeFont(fontSize * currentMaxScale),
        willClip: willTextClip(text, fontSize, 300),
        safeFontSize: getSafeFontSize(300, text, fontSize),
      })
    })

    setResults(testResults)

    const criticalIssues = testResults.filter((result) => result.willClip)
    if (criticalIssues.length > 0) {
      Alert.alert(
        "Font Scaling Issues Detected",
        `${criticalIssues.length} text elements may clip at maximum font scaling. See results for details.`,
        [{ text: "OK" }],
      )
    } else {
      Alert.alert("Font Scaling Test Complete", "All text elements passed the scaling test.", [
        { text: "OK" },
      ])
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Font Scaling Test</Text>
        <Text style={styles.subtitle}>
          Platform: {Platform.OS.toUpperCase()} | Max Scale: {maxScaleEnabled ? MAX_FONT_SCALE.toFixed(1) : "1.0"}
        </Text>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Enable Maximum Font Scaling</Text>
          <Switch
            value={maxScaleEnabled}
            onValueChange={setMaxScaleEnabled}
            trackColor={{ false: "#767577", true: "#81b6ff" }}
            thumbColor={maxScaleEnabled ? "#0a84ff" : "#f4f3f4"}
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
                Original: {result.originalSize}pt {'->'} Scaled: {result.scaledSize.toFixed(1)}pt
              </Text>
              {result.willClip && <Text style={styles.warning}>Text may clip at max scale</Text>}
              <Text style={styles.safeSize}>Safe Font Size: {result.safeFontSize.toFixed(1)}pt</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#6b7280" },
  toggleContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLabel: { fontSize: 16 },
  testButton: { backgroundColor: "#0a84ff", padding: 12, borderRadius: 8, alignItems: "center" },
  testButtonText: { color: "#fff", fontWeight: "600" },
  resultsContainer: { padding: 16, gap: 12 },
  resultsTitle: { fontSize: 18, fontWeight: "600" },
  resultItem: { padding: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, gap: 8 },
  resultHeader: { gap: 4 },
  resultType: { fontWeight: "700" },
  resultText: { color: "#111827" },
  resultDetails: { gap: 4 },
  detailText: { color: "#4b5563" },
  warning: { color: "#b45309" },
  safeSize: { color: "#047857" },
})
