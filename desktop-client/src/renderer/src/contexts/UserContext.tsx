import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { SERVER_URL } from '../config'
import { useError } from './ErrorContext'
import { shell } from 'electron'

export interface User {
  id: string
  name: string
  email: string
  picture: string
  numActiveToken: Record<string, number>
  TransientToken: string
}

interface UserContextType {
  user: User | null
  signIn: () => Promise<void>
  signOut: () => void
  decrementToken: (model: string) => void
  refetchUser: () => Promise<void>
  isLoading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used within a UserProvider')
  return context
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { showError } = useError()

  const decrementToken = (model: string) => {
    setUser((prev) => {
      if (!prev) return prev
      const current = prev.numActiveToken[model] || 0
      return {
        ...prev,
        numActiveToken: {
          ...prev.numActiveToken,
          [model]: current > 0 ? current - 1 : 0
        }
      }
    })
  }

  const fetchUser = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/me`, {
        method: 'GET',
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        const numActiveTokens: Record<string, number> = {
          ...data.data.SubscriptionInfo?.ActiveAuthTokens
        }
        setUser({
          id: data.data.id,
          name: data.data.Name,
          email: data.data.Email,
          picture: data.data.ProfileImage,
          numActiveToken: numActiveTokens,
          TransientToken: data.data.TransientToken
        })
      } else if (res.status === 401) {
        // Not authenticated
        setUser(null)
      } else {
        showError('Fetch user failed, status: ' + res.status, await res.json())
      }
    } catch (e) {
      showError('Fetch user failed, err: ' + e)
    } finally {
      setIsLoading(false)
    }
  }

  const refetchUser = async (): Promise<void> => {
    await fetchUser()
  }

  useEffect(() => {
    // Try to load user if already signed in (with cookies)
    fetchUser()
  }, [showError])

  useEffect(() => {
    // Listen for auth window close event and refetch user
    // @ts-ignore (window.api is injected by preload)
    window.api?.onAuthWindowClosed?.(() => {
      fetchUser()
    })
  }, [])

  const signIn = async () => {
    // const redirectUrl = 'llmmask://app'
    // const signInUrl = `${SERVER_URL}/api/v1/users/signin?redirect=${encodeURIComponent(redirectUrl)}`
    //
    // window.location.href = signInUrl
    await window.api.startAuth()
  }

  const signOut = () => setUser(null)

  return (
    <UserContext.Provider value={{ user, signIn, signOut, decrementToken, refetchUser, isLoading }}>
      {children}
    </UserContext.Provider>
  )
}
