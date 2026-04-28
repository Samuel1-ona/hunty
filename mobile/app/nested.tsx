import { View, Text, StyleSheet } from 'react-native';

export default function NestedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nested Screen</Text>
      <Text style={styles.subtitle}>
        Press Android back button to test navigation
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
