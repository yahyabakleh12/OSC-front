import {FC, lazy, Suspense} from 'react'
import {Navigate, Route, Routes} from 'react-router-dom'
import {MasterLayout} from '../../_metronic/layout/MasterLayout'
import TopBarProgress from 'react-topbar-progress-indicator'
import {DashboardWrapper} from '../pages/dashboard/DashboardWrapper'
import {getCSSVariableValue} from '../../_metronic/assets/ts/_utils'
import {WithChildren} from '../../_metronic/helpers'
import BuilderPageWrapper from '../pages/layout-builder/BuilderPageWrapper'
import {Locations} from "../pages/locations/Locations"
import {CreateLocation} from "../pages/locations/CreateLocation"
import {CreateLocationWizard} from "../pages/locations/CreateLocationWizard"
import {LocationDetail} from "../pages/locations/LocationDetail"
import {Zones} from "../pages/locations/Zones"
import { EditLocation } from '../pages/locations/EditLocation'
import { LocationCameraList } from '../pages/locations/LocationCameraList'
import { NotificationsPage } from '../pages/notifications/NotificationsPage'
import { CreateUserPage } from '../pages/users/CreateUserPage'
import { UsersListPage } from '../pages/users/UsersListPage'
import { EditUserPage } from '../pages/users/EditUserPage'
import { UserPermissionsPage } from '../pages/users/UserPermissionsPage'






const PrivateRoutes = () => {
  const ProfilePage = lazy(() => import('../modules/profile/ProfilePage'))
  const WizardsPage = lazy(() => import('../modules/wizards/WizardsPage'))
  const AccountPage = lazy(() => import('../modules/accounts/AccountPage'))
  const WidgetsPage = lazy(() => import('../modules/widgets/WidgetsPage'))
  const ChatPage = lazy(() => import('../modules/apps/chat/ChatPage'))
  const UsersPage = lazy(() => import('../modules/apps/user-management/UsersPage'))



  return (
    <Routes>
      <Route element={<MasterLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/create-user" element={<CreateUserPage token={localStorage.getItem('token') || ''} />} />
        <Route path='/users' element={<UsersListPage token={localStorage.getItem('token') || ''} />} />
        <Route path='/edit-user/:id' element={<EditUserPage token={localStorage.getItem('token') || ''} />} />
        <Route path='/user-permissions/:id'element={<UserPermissionsPage token={localStorage.getItem('token') || ''} />} />


        <Route path="/locations" element={<Locations />} />
        <Route path="/create" element={<CreateLocationWizard />} />
        <Route path='/locations/edit/:id' element={<EditLocation />} />
        <Route path='locations/:id' element={<LocationDetail />} />
        <Route path='locations/:id/zones' element={<Zones />} />
        <Route path='locations/:id/cameras' element={<LocationCameraList />} />
        <Route path='dashboard' element={<DashboardWrapper />} />
        <Route path='notifications' element={<NotificationsPage />} />
        <Route path='create-location' element={<CreateLocation />} />

        <Route
          path='builder'
          element={
            <SuspensedView>
              <BuilderPageWrapper />
            </SuspensedView>
          }
        />
        <Route
          path='crafted/pages/profile/*'
          element={
            <SuspensedView>
              <ProfilePage />
            </SuspensedView>
          }
        />
        <Route
          path='crafted/pages/wizards/*'
          element={
            <SuspensedView>
              <WizardsPage />
            </SuspensedView>
          }
        />
        <Route
          path='crafted/widgets/*'
          element={
            <SuspensedView>
              <WidgetsPage />
            </SuspensedView>
          }
        />
        <Route
          path='crafted/account/*'
          element={
            <SuspensedView>
              <AccountPage />
            </SuspensedView>
          }
        />
        <Route
          path='apps/chat/*'
          element={
            <SuspensedView>
              <ChatPage />
            </SuspensedView>
          }
        />
        <Route
          path='apps/user-management/*'
          element={
            <SuspensedView>
              <UsersPage />
            </SuspensedView>
          }
        />
        <Route path='*' element={<Navigate to='/error/404' />} />
      </Route>
    </Routes>
  )
}

const SuspensedView: FC<WithChildren> = ({children}) => {
  const baseColor = getCSSVariableValue('--bs-primary')
  TopBarProgress.config({
    barColors: {
      '0': baseColor,
    },
    barThickness: 1,
    shadowBlur: 5,
  })
  return <Suspense fallback={<TopBarProgress />}>{children}</Suspense>
}

export {PrivateRoutes}
