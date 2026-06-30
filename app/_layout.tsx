import '../global.css'
import { useEffect } from 'react'
import { I18nManager } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
} from '@expo-google-fonts/heebo'
import { AuthProvider, useAuth } from '@/components/providers/AuthContext'
import { MonthProvider } from '@/components/providers/MonthContext'
import { ToastContextProvider } from '@/components/ui/toast-context'

I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inTabsGroup = segments[0] === '(tabs)'
    if (!session && inTabsGroup) {
      router.replace('/login')
    } else if (session && !inTabsGroup) {
      router.replace('/(tabs)/expenses')
    }
  }, [session, loading, segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <AuthProvider>
      <MonthProvider>
        <ToastContextProvider>
          <RootLayoutNav />
        </ToastContextProvider>
      </MonthProvider>
    </AuthProvider>
  )
}
