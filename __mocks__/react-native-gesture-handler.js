/** Mock for react-native-gesture-handler — avoids TurboModule native registration errors in tests. */
const React = require('react');
const { View, ScrollView, TouchableOpacity } = require('react-native');

module.exports = {
  GestureHandlerRootView: View,
  Swipeable: View,
  DrawerLayout: View,
  State: {},
  PanGestureHandler: View,
  TapGestureHandler: View,
  FlingGestureHandler: View,
  ForceTouchGestureHandler: View,
  LongPressGestureHandler: View,
  NativeViewGestureHandler: View,
  PinchGestureHandler: View,
  RotationGestureHandler: View,
  ScrollView,
  Slider: View,
  Switch: View,
  TextInput: View,
  TouchableOpacity,
  TouchableWithoutFeedback: View,
  TouchableNativeFeedback: View,
  TouchableHighlight: View,
  RawButton: View,
  BaseButton: View,
  RectButton: View,
  BorderlessButton: View,
  createNativeWrapper: (Component) => Component,
  Directions: {},
  gestureHandlerRootHOC: (Component) => Component,
};
