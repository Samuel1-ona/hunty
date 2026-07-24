import { useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedCustomText } from '@components/themed';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 'discover',
    title: 'Discover Hunts Nearby',
    subtitle: 'Find active challenges pinned around your city and dive into story-driven adventures.',
    colors: ['#0B102A', '#143C8A'],
  },
  {
    id: 'solve',
    title: 'Solve Clues, Unlock Rewards',
    subtitle: 'Scan QR checkpoints, crack hints, and progress through each mission to increase your payout.',
    colors: ['#041E22', '#0E7C86'],
  },
  {
    id: 'win',
    title: 'Compete On Soroban',
    subtitle: 'Complete hunts first, confirm transactions, and claim XLM or NFT rewards on-chain.',
    colors: ['#26103A', '#8A2BE2'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const ctaLabel = useMemo(() => (index === slides.length - 1 ? 'Start Hunting' : 'Next'), [index]);

  const handleFinish = async () => {
    await AsyncStorage.setItem('hunty_onboarding_seen', 'true');
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (index >= slides.length - 1) {
      void handleFinish();
      return;
    }

    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  const handleSkip = () => {
    void handleFinish();
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setIndex(nextIndex);
        }}
        renderItem={({ item }) => (
          <LinearGradient colors={item.colors as [string, string]} style={styles.slide}>
            <View style={styles.badge}>
              <ThemedCustomText variant="caption" lightColor="#FFFFFF" darkColor="#FFFFFF" weight="700">
                HUNTY MOBILE
              </ThemedCustomText>
            </View>
            <ThemedCustomText variant="h1" lightColor="#FFFFFF" darkColor="#FFFFFF" weight="800" style={styles.title}>
              {item.title}
            </ThemedCustomText>
            <ThemedCustomText variant="body" lightColor="#E6ECFF" darkColor="#E6ECFF" style={styles.subtitle}>
              {item.subtitle}
            </ThemedCustomText>
          </LinearGradient>
        )}
      />

      <View style={styles.bottomBar}>
        <View style={styles.pagination}>
          {slides.map((slide, dotIndex) => (
            <View
              key={slide.id}
              style={[styles.dot, dotIndex === index ? styles.dotActive : undefined]}
            />
          ))}
        </View>

        <View style={styles.actionsRow}>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <ThemedCustomText variant="label" weight="600" style={styles.skipText}>Skip</ThemedCustomText>
          </Pressable>
          <Pressable onPress={handleNext} style={styles.nextButton}>
            <ThemedCustomText variant="label" lightColor="#0A0F2A" darkColor="#0A0F2A" weight="800">
              {ctaLabel}
            </ThemedCustomText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F2A',
  },
  slide: {
    width,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 130,
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  title: {
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 25,
    opacity: 0.95,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    backgroundColor: 'rgba(10, 15, 42, 0.82)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    gap: 14,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 28,
    backgroundColor: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  skipText: {
    color: '#DDE4FF',
  },
  nextButton: {
    minWidth: 146,
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: '#E8F3FF',
  },
});
