import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { HuntyRefreshControl } from '@components/HuntyRefreshControl';
import { useRefreshByUser } from '@hooks/useRefreshByUser';

// Placeholder for dashboard data fetching
const fetchDashboard = async () => ({ balance: 0 });

export default function Dashboard() {
  const { data, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  const { isRefreshing, onRefresh } = useRefreshByUser(refetch);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <HuntyRefreshControl 
          refreshing={isRefreshing} 
          onRefresh={onRefresh} 
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Balance: {data?.balance} XLM</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  subtitle: {
    color: '#64748b',
  },
});