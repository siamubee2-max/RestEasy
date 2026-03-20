/**
 * RestEasy — TabNavigator
 * iOS-style bottom tab bar with 5 tabs:
 * Home | Sleep Log | [Moon logo center] | Therapy | Profile
 * Night Mode is a modal stack, not a tab.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { WeeklyReviewScreen } from '../screens/WeeklyReviewScreen';
import { TherapyScreen } from '../screens/TherapyScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NightModeScreen } from '../screens/NightModeScreen';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon({ color }: { color: string }) {
  return (
    <Text style={{ fontSize: 20, color }}>🏠</Text>
  );
}
function JournalIcon({ color }: { color: string }) {
  return <Text style={{ fontSize: 20, color: color === colors.warmPeach ? undefined : 'rgba(184,169,201,0.5)' }}>📓</Text>;
}
function WeeklyIcon({ color }: { color: string }) {
  return <Text style={{ fontSize: 20 }}>📊</Text>;
}
function TherapyIcon({ color }: { color: string }) {
  return <Text style={{ fontSize: 20 }}>📚</Text>;
}
function ProfileIcon({ color }: { color: string }) {
  return <Text style={{ fontSize: 20 }}>👤</Text>;
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={tabStyles.bar}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isCenter = route.name === 'Weekly';

        const label = options.tabBarLabel ?? route.name;
        const color = isFocused ? colors.warmPeach : 'rgba(184,169,201,0.5)';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={tabStyles.centerBtn}
              activeOpacity={0.85}
            >
              <View style={[tabStyles.centerCircle, isFocused && tabStyles.centerCircleActive]}>
                <Text style={tabStyles.centerIcon}>🌙</Text>
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={tabStyles.tab}
            activeOpacity={0.7}
          >
            {options.tabBarIcon?.({ color, focused: isFocused, size: 22 })}
            <Text style={[tabStyles.label, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11, 29, 58, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(184, 169, 201, 0.1)',
    height: Platform.OS === 'ios' ? 82 : 64,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    ...typography.tabLabel,
  },
  centerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  centerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.navyMid,
    borderWidth: 2,
    borderColor: 'rgba(184, 169, 201, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.softLavender,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  centerCircleActive: {
    borderColor: colors.warmPeach,
    backgroundColor: 'rgba(45, 58, 110, 0.9)',
  },
  centerIcon: {
    fontSize: 24,
  },
});

// ─── Tab Navigator ────────────────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{
          tabBarLabel: 'Journal',
          tabBarIcon: ({ color }) => <JournalIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Weekly"
        component={WeeklyReviewScreen}
        options={{
          tabBarLabel: 'Bilan',
        }}
      />
      <Tab.Screen
        name="Therapy"
        component={TherapyScreen}
        options={{
          tabBarLabel: 'Thérapie',
          tabBarIcon: ({ color }) => <TherapyIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Stack (includes Night Mode modal) ───────────────────────────────────

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Night"
        component={NightModeScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
    </Stack.Navigator>
  );
}
