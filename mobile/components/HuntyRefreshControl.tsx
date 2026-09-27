import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { useHaptics } from '@hooks/useHaptics';

interface Props extends RefreshControlProps {
  onRefresh: () => void;
  refreshing: boolean;
}

export const HuntyRefreshControl = ({ refreshing, onRefresh, ...props }: Props) => {
  const haptics = useHaptics();

  const handleRefresh = () => {
    haptics.triggerSelection();
    onRefresh();
  };

  return (
    <RefreshControl
      accessible={true}
      accessibilityLabel="Pull to refresh"
      accessibilityState={{ busy: refreshing }}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor="#3737A4"
      colors={["#3737A4"]}
      {...props}
    />
  );
};