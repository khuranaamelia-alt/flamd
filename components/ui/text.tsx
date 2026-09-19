import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

const FAMILY_BY_WEIGHT: Record<string, string> = {
  '300': 'SpaceGrotesk_300Light',
  '400': 'SpaceGrotesk_400Regular',
  normal: 'SpaceGrotesk_400Regular',
  '500': 'SpaceGrotesk_500Medium',
  '600': 'SpaceGrotesk_600SemiBold',
  '700': 'SpaceGrotesk_700Bold',
  '800': 'SpaceGrotesk_700Bold',
  '900': 'SpaceGrotesk_700Bold',
  bold: 'SpaceGrotesk_700Bold',
};

export function Text({ style, ...rest }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, fontFamily, ...restStyle } = flat;
  const resolved =
    fontFamily ??
    FAMILY_BY_WEIGHT[String(fontWeight ?? '400')] ??
    'SpaceGrotesk_400Regular';
  return <RNText {...rest} style={[restStyle, { fontFamily: resolved }]} />;
}
