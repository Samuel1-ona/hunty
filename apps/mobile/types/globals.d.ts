declare module 'expo-application' {
  export function getIosIdForVendorAsync(): Promise<string | null>;
  export function getAndroidId(): string | null;
  export function getInstallStartTimeAsync(): Promise<number>;
  export function getInstallationTimeAsync(): Promise<number>;
}

declare module '@react-native-community/netinfo' {
  export type NetInfoState = {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    isConnectionExpensive: boolean | null;
    type: string;
    details: Record<string, unknown> | null;
  };
  export type NetInfoSubscription = () => void;
  export function addEventListener(cb: (state: NetInfoState) => void): NetInfoSubscription;
  export function fetch(): Promise<NetInfoState>;
}

declare module '@expo/vector-icons' {
  import type { ComponentType } from 'react';
  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: unknown;
  }
  export const Ionicons: ComponentType<IconProps> & { glyphMap: Record<string, number | string> };
  export const MaterialIcons: ComponentType<IconProps> & {
    glyphMap: Record<string, number | string>;
  };
  export const FontAwesome: ComponentType<IconProps> & {
    glyphMap: Record<string, number | string>;
  };
  export const MaterialCommunityIcons: ComponentType<IconProps> & {
    glyphMap: Record<string, number | string>;
  };
  export const Feather: ComponentType<IconProps> & { glyphMap: Record<string, number | string> };
  export const FontAwesome5: ComponentType<IconProps> & {
    glyphMap: Record<string, number | string>;
  };
  export const AntDesign: ComponentType<IconProps> & { glyphMap: Record<string, number | string> };
  export const Entypo: ComponentType<IconProps> & { glyphMap: Record<string, number | string> };
  export const Octicons: ComponentType<IconProps> & { glyphMap: Record<string, number | string> };
  export const SimpleLineIcons: ComponentType<IconProps> & {
    glyphMap: Record<string, number | string>;
  };
  export const Foundation: ComponentType<IconProps> & { glyphMap: Record<string, number | string> };
}
