import {Platform} from 'react-native';

// Android emulator uses 10.0.2.2 to reach host machine's localhost.
// iOS simulator can use the LAN IP directly.
const DEFAULT_HOST = Platform.select({
  android: '10.0.2.2',
  ios: '192.168.50.7',
}) as string;

export const DEFAULT_SERVER_URL = `http://${DEFAULT_HOST}:3000`;
