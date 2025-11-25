import {Navigate, Route, Routes} from 'react-router-dom'
import {ForgotPassword} from './components/ForgotPassword'
import {Login} from './components/Login'
import {AuthLayout} from './AuthLayout'

const AuthPage = () => (
  <Routes>
    <Route element={<AuthLayout />}>
      <Route path='login' element={<Login />} />
      
      <Route path='forgot-password' element={<ForgotPassword />} />
      <Route index element={<Login />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Route>
  </Routes>
)

export {AuthPage}
