/**
 * Full navigation structure for the app.
 *
 * The layout is two-level:
 *
 *   RootStack (NativeStack)
 *   ├── Main (no header) → MainTabs
 *   │     ├── Distill tab  → WorldviewScreen
 *   │     ├── Advocate tab → AdvocateScreen
 *   │     ├── Challenge tab → ChallengerScreen
 *   │     └── Library tab  → LibraryNavigator (nested NativeStack)
 *   │           ├── Themes → ThemesScreen
 *   │           └── Knowledge → KnowledgeScreen
 *   └── Settings (modal, slides up from bottom) → SettingsScreen
 *
 * Settings is a modal on the root stack rather than a tab so it can be reached
 * from any tab via the gear icon in the header — no need to switch tabs.
 *
 * The Library tab uses its own nested stack so users can drill from the Themes
 * list into the Knowledge base. Both screens share a header.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, TouchableOpacity } from 'react-native';
import { WorldviewScreen } from '../screens/WorldviewScreen';
import { AdvocateScreen } from '../screens/AdvocateScreen';
import { ChallengerScreen } from '../screens/ChallengerScreen';
import { ThemesScreen } from '../screens/ThemesScreen';
import { KnowledgeScreen } from '../screens/KnowledgeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PositionsScreen } from '../screens/PositionsScreen';
import { PositionChatScreen } from '../screens/PositionChatScreen';

const Tab = createBottomTabNavigator();
const LibraryStack = createNativeStackNavigator();
const PositionsStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

/** Renders an emoji as a tab bar icon, dimmed when the tab is inactive. */
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{label}</Text>;
}

/** Positions list → individual position chat. */
function PositionsNavigator() {
  return (
    <PositionsStack.Navigator>
      <PositionsStack.Screen
        name="PositionsList"
        component={PositionsScreen}
        options={{ title: 'Positions' }}
      />
      <PositionsStack.Screen
        name="PositionChat"
        component={PositionChatScreen}
        options={({ route }: any) => ({ title: route.params?.topic ?? 'Position' })}
      />
    </PositionsStack.Navigator>
  );
}

/** The Themes → Knowledge nested navigator for the Library tab. */
function LibraryNavigator() {
  return (
    <LibraryStack.Navigator>
      <LibraryStack.Screen
        name="Themes"
        component={ThemesScreen}
        options={{ title: 'Worldview Themes' }}
      />
      <LibraryStack.Screen
        name="Knowledge"
        component={KnowledgeScreen}
        options={{ title: 'Knowledge Base' }}
      />
    </LibraryStack.Navigator>
  );
}

/** Renders the gear icon in the header that opens Settings as a modal. */
function settingsButton(navigation: any) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Settings')}
      style={{ marginRight: 14 }}
    >
      <Text style={{ fontSize: 20 }}>⚙️</Text>
    </TouchableOpacity>
  );
}

/**
 * The four-tab navigator. `navigation` is passed in from the root stack so the
 * settings button can navigate up to the modal — a tab navigator can't push a
 * modal on its own stack, but the parent root stack can.
 */
function MainTabs({ navigation }: { navigation: any }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1a1a2e',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { paddingBottom: 4 },
        headerRight: () => settingsButton(navigation),
      }}
    >
      <Tab.Screen
        name="Distill"
        component={WorldviewScreen}
        options={{
          title: 'Distill',
          headerTitle: 'Build Worldview',
          tabBarIcon: ({ focused }) => <TabIcon label="💡" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Positions"
        component={PositionsNavigator}
        options={{
          title: 'Positions',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon label="🎯" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Advocate"
        component={AdvocateScreen}
        options={{
          title: 'Advocate',
          headerTitle: 'Advocate',
          tabBarIcon: ({ focused }) => <TabIcon label="⚖️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Challenge"
        component={ChallengerScreen}
        options={{
          title: 'Challenge',
          headerTitle: 'Challenge',
          tabBarIcon: ({ focused }) => <TabIcon label="🔥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryNavigator}
        options={{
          title: 'Library',
          headerShown: false,  // LibraryNavigator has its own header
          tabBarIcon: ({ focused }) => <TabIcon label="📚" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

/** The root navigator — exported and used by AppContent in App.tsx. */
export function AppNavigator() {
  return (
    <RootStack.Navigator>
      <RootStack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      {/* Settings slides up as a modal from any tab */}
      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings', presentation: 'modal' }}
      />
    </RootStack.Navigator>
  );
}
