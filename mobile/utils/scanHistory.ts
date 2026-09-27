import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScanEntry {
  data: string;
  timestamp: number;
}

const HISTORY_KEY = 'qr_scan_history';

export async function loadScanHistory(): Promise<ScanEntry[]> {
  const json = await AsyncStorage.getItem(HISTORY_KEY);
  return json ? JSON.parse(json) : [];
}

export async function addScanEntry(entry: ScanEntry): Promise<void> {
  const history = await loadScanHistory();
  history.push(entry);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export async function clearScanHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
