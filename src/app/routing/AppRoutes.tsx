import { FC } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PrivateRoutes } from './PrivateRoutes'
import { ErrorsPage } from '../modules/errors/ErrorsPage'
import { Logout, AuthPage, useAuth } from '../modules/auth'
import { Page404 } from '../pages/Page404'
import { App } from '../App'

const { BASE_URL } = import.meta.env

const AppRoutes: FC = () => {
  const { auth, currentUser } = useAuth()
  const isAuthenticated = !!auth?.api_token || !!currentUser

  return (
    <BrowserRouter basename={BASE_URL}>
      <Routes>
        <Route
          path="auth/*"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
          }
        />
        <Route path="logout" element={<Logout />} />
        <Route path="error/*" element={<Page404 />} />
        <Route path="404" element={<Page404 />} />
        {isAuthenticated ? (
          <Route element={<App />}>
            <Route path="*" element={<PrivateRoutes />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}

export { AppRoutes }
