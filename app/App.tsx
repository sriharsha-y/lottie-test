import React, {useState, useCallback} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LottieView, {type AnimationObject} from 'lottie-react-native';
import {DEFAULT_SERVER_URL} from './src/config';
import {
  fetchLottie,
  flipVersion,
  setMode,
  setLastModified,
  getServerState,
  resetServer,
} from './src/api';
import type {LottieFetchResult, ServerState} from './src/types';

function App(): React.JSX.Element {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [animationJson, setAnimationJson] = useState<AnimationObject | null>(null);
  const [fetchResult, setFetchResult] = useState<LottieFetchResult | null>(null);
  const [serverState, setServerState] = useState<ServerState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const refreshServerState = useCallback(async () => {
    try {
      const state = await getServerState(serverUrl);
      setServerState(state);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`State fetch error: ${msg}`);
    }
  }, [serverUrl, addLog]);

  const handleFetch = useCallback(async (noCache = false) => {
    setLoading(true);
    try {
      const result = await fetchLottie(serverUrl, noCache);
      setFetchResult(result);
      if (result.json) {
        setAnimationJson(result.json as unknown as AnimationObject);
      }
      addLog(
        `Fetch → ${result.status} | v${result.demoVersion} | ` +
        `hash:${result.bodySha256.slice(0, 8)}… | ${result.fetchTimeMs}ms` +
        (result.cacheControl ? ` | CC: ${result.cacheControl}` : ''),
      );
      await refreshServerState();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`Fetch error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [serverUrl, addLog, refreshServerState]);

  const handleFlip = useCallback(async () => {
    try {
      const res = await flipVersion(serverUrl);
      addLog(`Flipped → v${res.version}`);
      await refreshServerState();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`Flip error: ${msg}`);
    }
  }, [serverUrl, addLog, refreshServerState]);

  const handleSetMode = useCallback(async (mode: 'A' | 'B') => {
    try {
      await setMode(serverUrl, mode);
      addLog(`Mode → ${mode}`);
      await refreshServerState();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`Mode error: ${msg}`);
    }
  }, [serverUrl, addLog, refreshServerState]);

  const handleSetLastModified = useCallback(async (iso: string) => {
    try {
      await setLastModified(serverUrl, iso);
      addLog(`Last-Modified → ${iso}`);
      await refreshServerState();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`Last-Modified error: ${msg}`);
    }
  }, [serverUrl, addLog, refreshServerState]);

  const handleReset = useCallback(async () => {
    try {
      await resetServer(serverUrl);
      setAnimationJson(null);
      setFetchResult(null);
      addLog('Server reset');
      await refreshServerState();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`Reset error: ${msg}`);
    }
  }, [serverUrl, addLog, refreshServerState]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Lottie Cache Demo</Text>

        {/* Server URL Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.50.7:3000"
            placeholderTextColor="#666"
          />
        </View>

        {/* Lottie Preview */}
        <View style={styles.previewContainer}>
          {animationJson ? (
            <LottieView
              source={animationJson}
              autoPlay
              loop
              style={styles.lottie}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>No animation loaded</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.buttonRow}>
            <Btn title="Fetch" color="#2196F3" loading={loading} onPress={() => handleFetch(false)} />
            <Btn title="Fetch (no-cache)" color="#00BCD4" onPress={() => handleFetch(true)} />
            <Btn title="Flip Version" color="#FF9800" onPress={handleFlip} />
          </View>
          <View style={styles.buttonRow}>
            <Btn title="Mode A" color="#9C27B0" onPress={() => handleSetMode('A')} />
            <Btn title="Mode B" color="#4CAF50" onPress={() => handleSetMode('B')} />
            <Btn title="Reset" color="#f44336" onPress={handleReset} />
          </View>
          <View style={styles.buttonRow}>
            <Btn title="LM: Dec 15" color="#795548" onPress={() => handleSetLastModified('2025-12-15T00:00:00Z')} />
            <Btn title="LM: Now" color="#607D8B" onPress={() => handleSetLastModified(new Date().toISOString())} />
          </View>
        </View>

        {/* Response Info */}
        {fetchResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Fetch Response</Text>
            <InfoRow label="Status" value={String(fetchResult.status)} />
            <InfoRow label="demoVersion" value={String(fetchResult.demoVersion ?? '—')} />
            <InfoRow label="ETag" value={fetchResult.etag ?? '—'} />
            <InfoRow label="Last-Modified" value={fetchResult.lastModified ?? '—'} />
            <InfoRow label="Cache-Control" value={fetchResult.cacheControl ?? '(none)'} />
            <InfoRow label="Body SHA-256" value={fetchResult.bodySha256} mono />
            <InfoRow label="Body Length" value={`${fetchResult.bodyLength} bytes`} />
            <InfoRow label="Fetch Time" value={`${fetchResult.fetchTimeMs} ms`} />
          </View>
        )}

        {/* Server State */}
        {serverState && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Server State</Text>
            <InfoRow label="Mode" value={serverState.mode} />
            <InfoRow label="Version" value={`v${serverState.version}`} />
            <InfoRow label="Request Count" value={String(serverState.requestCount)} highlight />
            <InfoRow label="Server ETag" value={serverState.etag} mono />
            <InfoRow label="Last-Modified" value={serverState.lastModified} />
          </View>
        )}

        {/* Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Log</Text>
          {log.length === 0 ? (
            <Text style={styles.logText}>No activity yet</Text>
          ) : (
            log.map((entry, i) => (
              <Text key={i} style={styles.logText}>{entry}</Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Btn({
  title,
  color,
  onPress,
  loading,
}: {
  title: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, {backgroundColor: color}]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}>
      <Text style={styles.btnText}>{loading ? '…' : title}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[
          styles.infoValue,
          mono && styles.mono,
          highlight && styles.highlight,
        ]}
        numberOfLines={2}
        ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e0e0e0',
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#bb86fc',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#2a2a4a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#444',
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    backgroundColor: '#16213e',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  lottie: {
    width: 180,
    height: 180,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  infoLabel: {
    color: '#aaa',
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    color: '#e0e0e0',
    fontSize: 13,
    flex: 2,
    textAlign: 'right',
  },
  mono: {
    fontFamily: 'Courier',
    fontSize: 11,
  },
  highlight: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  logText: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'Courier',
    marginBottom: 2,
  },
});

export default App;
