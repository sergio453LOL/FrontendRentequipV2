import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import { typographyFor, type Palette, type Typography } from './index'

type Styles = Record<string, ViewStyle | TextStyle | ImageStyle>

/**
 * Styles that follow the light or dark theme. The factory runs once per palette and is cached, so
 * switching themes swaps two precomputed style sheets instead of rebuilding them on every render.
 * Like `StyleSheet.create`, the `S & Styles` return type keeps `fontWeight: '700'` a font weight
 * instead of widening it to `string`.
 */
export function makeStyles<S extends Styles>(factory: (colors: Palette, typography: Typography) => S & Styles) {
  const cache = new Map<Palette, Readonly<S>>()
  return function useStyles(): Readonly<S> {
    const { colors } = useTheme()
    const cached = cache.get(colors)
    if (cached) return cached
    const styles = StyleSheet.create(factory(colors, typographyFor(colors)))
    cache.set(colors, styles)
    return styles
  }
}
