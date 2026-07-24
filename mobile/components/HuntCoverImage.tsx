import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { resolveImageSrc, GATEWAY_COUNT } from '@lib/ipfs';

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface HuntCoverImageProps {
  src?: string;
  alt: string;
  style?: object;
}

export function HuntCoverImage({ src, alt, style }: HuntCoverImageProps) {
  const [gatewayIdx, setGatewayIdx] = useState(0);

  const uri = src ? resolveImageSrc(src, gatewayIdx) : undefined;

  return (
    <View style={[styles.container, style]}>
      <Image
        testID="hunt-cover-image"
        source={uri ? { uri } : require('../assets/icon.png')}
        accessibilityLabel={alt}
        style={styles.image}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        recyclingKey={uri ?? 'hunt-cover-fallback'}
        placeholder={{ blurhash }}
        onError={() => {
          if (gatewayIdx < GATEWAY_COUNT - 1) {
            setGatewayIdx((idx) => idx + 1);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
