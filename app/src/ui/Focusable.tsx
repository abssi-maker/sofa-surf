import React, {useRef, useState} from 'react';
import {Animated, Pressable, StyleProp, StyleSheet, ViewStyle} from 'react-native';

import {C, sized} from './theme';

// A D-pad target: grows smoothly and gets a white ring (or focusedStyle) when focused.
export const Focusable = ({
  onPress,
  preferred,
  style,
  focusedStyle,
  grow = 1.06,
  ring = true,
  children,
}: {
  onPress: () => void;
  preferred?: boolean;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  grow?: number;
  ring?: boolean;
  children: (focused: boolean) => React.ReactNode;
}) => {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.timing(scale, {toValue: v, duration: 160, useNativeDriver: true}).start();
  return (
    <Pressable
      onPress={onPress}
      onFocus={() => {
        setFocused(true);
        to(grow);
      }}
      onBlur={() => {
        setFocused(false);
        to(1);
      }}
      hasTVPreferredFocus={preferred}>
      <Animated.View style={[style, styles.base, focused && ring && styles.focused, focused && focusedStyle, {transform: [{scale}]}]}>
        {children(focused)}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create(sized({
  base: {borderWidth: 4, borderColor: 'transparent', borderRadius: 18},
  focused: {borderColor: C.focus},
}));
