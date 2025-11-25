import {
  FC,
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  Dispatch,
  SetStateAction,
} from 'react'
import axios from 'axios'
import { LayoutSplashScreen } from '../../../../_metronic/layout/core'
import { AuthModel, UserModel } from './_models'
import * as authHelper from './AuthHelpers'
import { getUserByToken } from './_requests'
import { WithChildren } from '../../../../_metronic/helpers'

type AuthContextProps = {
  auth: AuthModel | undefined
  saveAuth: (auth: AuthModel | undefined) => void
  currentUser: UserModel | undefined
  setCurrentUser: Dispatch<SetStateAction<UserModel | undefined>>
  logout: () => void
}

const initAuthContextPropsState: AuthContextProps = {
  auth: authHelper.getAuth(),
  saveAuth: () => {},
  currentUser: undefined,
  setCurrentUser: () => {},
  logout: () => {},
}

const AuthContext = createContext<AuthContextProps>(initAuthContextPropsState)

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: FC<WithChildren> = ({ children }) => {
  const [auth, setAuth] = useState<AuthModel | undefined>(() => authHelper.getAuth())
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>()

  // ✅ Memoized functions (don’t recreate every render)
  const saveAuth = useCallback((auth: AuthModel | undefined) => {
    setAuth(auth)
    if (auth) authHelper.setAuth(auth)
    else authHelper.removeAuth()
  }, [])

  const logout = useCallback(() => {
    saveAuth(undefined)
    setCurrentUser(undefined)
  }, [saveAuth])

  return (
    <AuthContext.Provider
      value={{
        auth,
        saveAuth,
        currentUser,
        setCurrentUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const AuthInit: FC<WithChildren> = ({ children }) => {
  const { auth, logout, setCurrentUser } = useAuth()
  const [showSplashScreen, setShowSplashScreen] = useState(true)

  useEffect(() => {
    const initialize = async () => {
      // ⏳ Don’t log out until we actually know the auth state
      if (!auth?.api_token) {
        setShowSplashScreen(false)
        return
      }

      try {
        const { data } = await getUserByToken(auth.api_token)
        if (data?.user) {
          setCurrentUser(data.user)
        } else {
          console.warn('⚠️ No user in profile response:', data)
          logout()
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            console.warn('Token expired or invalid, logging out.')
            logout()
          } else {
            console.error('Profile fetch error:', error.message)
          }
        } else {
          console.error('Unexpected error:', error)
        }
      } finally {
        setShowSplashScreen(false)
      }
    }

    initialize()
  }, [auth?.api_token, logout, setCurrentUser])

  return showSplashScreen ? <LayoutSplashScreen /> : <>{children}</>
}
