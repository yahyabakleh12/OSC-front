import { useAuth } from '../../../../app/modules/auth'
import { KTIcon, toAbsoluteUrl } from '../../../helpers'

const AsideToolbar = () => {
  const { currentUser, logout } = useAuth()

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    logout() 
    window.location.href = '/auth/login' 
  }

  return (
    <>
      {/*begin::User*/}
      <div className='aside-user d-flex align-items-sm-center justify-content-center py-5'>
        {/*begin::Symbol*/}
      

        <div className="symbol symbol-50px">
  <div className="symbol-label fs-2 fw-bold bg-danger text-inverse-danger text-uppercase">{currentUser?.username.charAt(0)}</div>
</div>
        {/*end::Symbol*/}

        {/*begin::Wrapper*/}
        <div className='aside-user-info flex-row-fluid flex-wrap ms-5'>
          <div className='d-flex'>
            {/*begin::Info*/}
            <div className='flex-grow-1 me-2'>
              {/*begin::Username*/}
              <span className='text-white fs-6 fw-bold text-capitalize'>
                {currentUser?.username}
              </span>
              {/*end::Username*/}

              {/*begin::Description*/}
              <span className='text-gray-600 fw-bold d-block fs-8 mb-1'>
                 Exp: {currentUser?.exp || 'N/A'}
              </span>
              {/*end::Description*/}
            </div>
            {/*end::Info*/}

            {/*begin::Logout button*/}
            <div className='me-n2'>
              <a
                href='#'
                onClick={handleLogout}
                className='btn btn-icon btn-sm btn-active-color-danger mt-n2'
                title='Logout'
              >
                <KTIcon iconName='exit-right' className='text-danger fs-1' />
              </a>
            </div>
            {/*end::Logout button*/}
          </div>
        </div>
        {/*end::Wrapper*/}
      </div>
      {/*end::User*/}
    </>
  )
}

export { AsideToolbar }
