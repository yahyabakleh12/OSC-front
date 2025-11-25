

import {FC} from 'react'
import {useLayout} from '../../core'
import {KTIcon} from '../../../helpers'
import {AsideMenu} from './AsideMenu'
import {AsideToolbar} from './AsideToolbar'

const AsideDefault: FC = () => {
  const {classes} = useLayout()

  return (
    <div
      id='kt_aside'
      className='aside'
      data-kt-drawer='true'
      data-kt-drawer-name='aside'
      data-kt-drawer-activate='{default: true, lg: false}'
      data-kt-drawer-overlay='true'
      data-kt-drawer-width="{default:'200px', '300px': '250px'}"
      data-kt-drawer-direction='start'
      data-kt-drawer-toggle='#kt_aside_mobile_toggle'
    >
      {/* begin::Aside Toolbarl */}
      <div className='aside-toolbar flex-column-auto' id='kt_aside_toolbar'>
        <AsideToolbar />
      </div>
      {/* end::Aside Toolbarl */}
      {/* begin::Aside menu */}
      <div className='aside-menu flex-column-fluid'>
        <AsideMenu asideMenuCSSClasses={classes.asideMenu} />
      </div>
      {/* end::Aside menu */}

      {/* begin::Footer */}
      <div className='aside-footer flex-column-auto py-5' id='kt_aside_footer'>
        <a
          className='btn btn-custom btn-primary w-100'
          href='/create'
          data-bs-toggle='tooltip'
          data-bs-trigger='hover'
          data-bs-dismiss-='click'
          title='Create Location'
        >
          <span className='btn-label'>Create Location</span>
          <span className=' btn-icon fs-2'>
            <KTIcon iconName='document' />
          </span>
        </a>
      </div>
      {/* end::Footer */}
    </div>
  )
}

export {AsideDefault}
