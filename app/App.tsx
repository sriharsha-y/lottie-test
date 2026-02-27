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
  Image,
} from 'react-native';
import LottieView, {type AnimationObject} from 'lottie-react-native';
import {SvgXml} from 'react-native-svg';
import {Buffer} from 'buffer';
import {DEFAULT_SERVER_URL} from './src/config';
import {
  fetchLottie,
  fetchImage,
  flipVersion,
  setMode,
  setLastModified,
  getServerState,
  resetServer,
} from './src/api';
import type {LottieFetchResult, ImageFetchResult, ServerState, ImageFormat} from './src/types';

type TabType = 'json' | 'png' | 'svg';

function formatIST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
}

function formatISTTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata'});
}

function App(): React.JSX.Element {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [activeTab, setActiveTab] = useState<TabType>('json');

  // JSON (Lottie) state
  const [animationJson, setAnimationJson] = useState<AnimationObject | null>(null);
  const [jsonResult, setJsonResult] = useState<LottieFetchResult | null>(null);

  // PNG state
  const [pngBase64, setPngBase64] = useState<string | null>(null);
  const [pngResult, setPngResult] = useState<ImageFetchResult | null>(null);

  // SVG state
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [svgResult, setSvgResult] = useState<ImageFetchResult | null>(null);

  const [serverState, setServerState] = useState<ServerState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = useCallback((msg: string) => {
    const ts = formatISTTime(new Date());
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

  const handleFetchJson = useCallback(async (noCache = false) => {
    setLoading(true);
    try {
      const result = await fetchLottie(serverUrl, noCache);
      setJsonResult(result);
      if (result.json) {
        setAnimationJson(result.json as unknown as AnimationObject);
      }
      addLog(
        `[JSON] ${result.status} | v${result.demoVersion} | ` +
        `${result.bodySha256.slice(0, 8)}… | ${result.fetchTimeMs}ms`,
      );
      await refreshServerState();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`[JSON] Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [serverUrl, addLog, refreshServerState]);

  const handleFetchImage = useCallback(async (format: ImageFormat, noCache = false) => {
    setLoading(true);
    try {
      const result = await fetchImage(serverUrl, format, noCache);
      if (format === 'png') {
        setPngResult(result);
        if (result.base64) {
          setPngBase64(result.base64);
        }
      } else {
        setSvgResult(result);
        if (result.base64) {
          const svgContent = Buffer.from(result.base64, 'base64').toString('utf8');
          setSvgXml(svgContent);
        }
      }
      addLog(
        `[${format.toUpperCase()}] ${result.status} | ` +
        `${result.bodySha256.slice(0, 8)}… | ${result.fetchTimeMs}ms`,
      );
      await refreshServerState();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`[${format.toUpperCase()}] Error: ${msg}`);
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
      setJsonResult(null);
      setPngBase64(null);
      setPngResult(null);
      setSvgXml(null);
      setSvgResult(null);
      addLog('Server reset');
      await refreshServerState();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`Reset error: ${msg}`);
    }
  }, [serverUrl, addLog, refreshServerState]);

  const handleFetch = useCallback((noCache = false) => {
    if (activeTab === 'json') {
      handleFetchJson(noCache);
    } else {
      handleFetchImage(activeTab, noCache);
    }
  }, [activeTab, handleFetchJson, handleFetchImage]);

  const getCurrentResult = () => {
    if (activeTab === 'json') return jsonResult;
    if (activeTab === 'png') return pngResult;
    return svgResult;
  };

  const renderPreview = () => {
    if (activeTab === 'json') {
      if (animationJson) {
        return (
          <LottieView
            source={animationJson}
            autoPlay
            loop
            style={styles.lottie}
          />
        );
      }
      return <Text style={styles.placeholderText}>No animation loaded</Text>;
    }

    if (activeTab === 'png') {
      if (pngBase64) {
        return (
          <Image
            source={{uri: `data:image/png;base64,${pngBase64}`}}
            style={styles.image}
            resizeMode="contain"
          />
        );
      }
      return <Text style={styles.placeholderText}>No PNG loaded</Text>;
    }

    if (activeTab === 'svg') {
      if (svgXml) {
        return <SvgXml xml={svgXml} width={180} height={180} />;
      }
      return <Text style={styles.placeholderText}>No SVG loaded</Text>;
    }

    return null;
  };

  const result = getCurrentResult();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Cache Demo</Text>

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

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <Tab title="JSON" active={activeTab === 'json'} onPress={() => setActiveTab('json')} />
          <Tab title="PNG" active={activeTab === 'png'} onPress={() => setActiveTab('png')} />
          <Tab title="SVG" active={activeTab === 'svg'} onPress={() => setActiveTab('svg')} />
        </View>

        {/* Preview */}
        <View style={styles.previewContainer}>
          {renderPreview()}
        </View>

        {/* Fetch Buttons */}
        <View style={styles.section}>
          <View style={styles.buttonRow}>
            <Btn title="Fetch" color="#2196F3" loading={loading} onPress={() => handleFetch(false)} />
            <Btn title="Force Fetch" color="#00BCD4" onPress={() => handleFetch(true)} />
          </View>
        </View>

        {/* Server Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Controls</Text>
          <View style={styles.buttonRow}>
            <Btn title="Flip Version" color="#FF9800" onPress={handleFlip} />
            <Btn title="Mode A" color="#9C27B0" onPress={() => handleSetMode('A')} />
            <Btn title="Mode B" color="#4CAF50" onPress={() => handleSetMode('B')} />
          </View>
          <View style={styles.buttonRow}>
            <Btn title="LM: Dec 15" color="#795548" onPress={() => handleSetLastModified('2025-12-15T00:00:00Z')} />
            <Btn title="LM: Now" color="#607D8B" onPress={() => handleSetLastModified(new Date().toISOString())} />
            <Btn title="Reset" color="#f44336" onPress={handleReset} />
          </View>
        </View>

        {/* Response Info */}
        {result && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last {activeTab.toUpperCase()} Response</Text>
            <InfoRow label="Status" value={String(result.status)} />
            {'demoVersion' in result && (
              <InfoRow label="demoVersion" value={String(result.demoVersion ?? '—')} />
            )}
            <InfoRow label="ETag" value={result.etag ?? '—'} />
            <InfoRow label="Last-Modified" value={result.lastModified ? formatIST(result.lastModified) : '—'} />
            <InfoRow label="Cache-Control" value={result.cacheControl ?? '(none)'} />
            <InfoRow label="Body SHA-256" value={result.bodySha256 || '—'} mono />
            <InfoRow label="Body Length" value={`${result.bodyLength} bytes`} />
            <InfoRow label="Fetch Time" value={`${result.fetchTimeMs} ms`} />
          </View>
        )}

        {/* Server State */}
        {serverState && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Server State</Text>
            <InfoRow label="Mode" value={serverState.mode} />
            <InfoRow label="Version" value={`v${serverState.version}`} />
            <InfoRow label="JSON Requests" value={String(serverState.jsonCount ?? serverState.requestCount)} highlight />
            <InfoRow label="PNG Requests" value={String(serverState.pngCount ?? 0)} highlight />
            <InfoRow label="SVG Requests" value={String(serverState.svgCount ?? 0)} highlight />
            <InfoRow label="Cache-Control" value={serverState.cacheControl ?? '(none)'} />
            <InfoRow label="Server ETag" value={serverState.etag} mono />
            <InfoRow label="Last-Modified" value={formatIST(serverState.lastModified)} />
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

function Tab({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a4a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  tabActive: {
    backgroundColor: '#bb86fc',
    borderColor: '#bb86fc',
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#1a1a2e',
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
  image: {
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
