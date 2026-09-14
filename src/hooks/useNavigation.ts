// src/hooks/useNavigation.ts

import { useState } from 'react'
import type { Screen } from '@/types'

const SCREEN_STORAGE_KEY = 'app_current_screen'

export type UseNavigationReturn = {
  screen: Screen
  previousScreen: Screen
  navigate: (screen: Screen) => void
}

export function useNavigation(
  initial: Screen = 'login'
): UseNavigationReturn {
  /*
   * ============================================================
   * RESTORE CURRENT SCREEN
   * ============================================================
   *
   * On browser refresh React state is recreated.
   * Therefore restore the last screen from localStorage.
   */
  const [screen, setScreen] = useState<Screen>(() => {
    try {
      const savedScreen =
        localStorage.getItem(
          SCREEN_STORAGE_KEY
        )

      if (savedScreen) {
        return savedScreen as Screen
      }
    } catch (error) {
      console.error(
        'Unable to restore saved screen:',
        error
      )
    }

    return initial
  })

  /*
   * Previous screen is only needed during the
   * current application session.
   */
  const [previousScreen, setPreviousScreen] =
    useState<Screen>(initial)

  /*
   * ============================================================
   * NAVIGATE
   * ============================================================
   *
   * Every navigation is saved so that refreshing the browser
   * keeps the user on the same page.
   */
  const navigate = (nextScreen: Screen) => {
    setPreviousScreen(screen)
    setScreen(nextScreen)

    try {
      localStorage.setItem(
        SCREEN_STORAGE_KEY,
        nextScreen
      )
    } catch (error) {
      console.error(
        'Unable to save current screen:',
        error
      )
    }
  }

  return {
    screen,
    previousScreen,
    navigate,
  }
}
