import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'

const BASE_COLOR = '#E4E6F1'
const HIGHLIGHT_COLOR = 'rgba(255, 255, 255, 0.35)'

const useShimmer = () => {
  const translate = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translate, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ])
    )

    animation.start()
    return () => animation.stop()
  }, [translate])

  const shimmerStyle = {
    transform: [
      {
        translateX: translate.interpolate({
          inputRange: [0, 1],
          outputRange: [-150, 150]
        })
      }
    ]
  }

  return shimmerStyle
}

export const SkeletonCard = ({ children, style, shimmerWidth = '45%' }) => {
  const shimmerStyle = useShimmer()

  return (
    <View style={[styles.card, style]}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.shimmer, { width: shimmerWidth }, shimmerStyle]}
      />
    </View>
  )
}

export const SkeletonBlock = ({ width = '100%', height = 14, borderRadius = 10, style }) => (
  <View style={[styles.block, { width, height, borderRadius }, style]} />
)

export const SkeletonCircle = ({ size = 48, style }) => (
  <View
    style={[
      styles.block,
      {
        width: size,
        height: size,
        borderRadius: size / 2
      },
      style
    ]}
  />
)

export const SkeletonPill = ({ width = '40%', height = 18, style }) => (
  <SkeletonBlock width={width} height={height} borderRadius={height / 2} style={style} />
)

export const SkeletonButton = ({ style }) => (
  <SkeletonBlock height={36} borderRadius={18} style={style} />
)

const styles = StyleSheet.create({
  card: {
    backgroundColor: BASE_COLOR,
    borderRadius: 16,
    overflow: 'hidden'
  },
  block: {
    backgroundColor: BASE_COLOR
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: HIGHLIGHT_COLOR,
    opacity: 0.65
  }
})

export default SkeletonCard
