/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import noUiSlider, { target } from 'nouislider'
import { useLayout } from '../../core'
import { KTIcon } from '../../../helpers'
import { DefaultTitle } from './page-title/DefaultTitle'
import { ThemeModeSwitcher } from '../../../partials'

const HeaderToolbar = () => {
  const { classes } = useLayout()
  const [status, setStatus] = useState<string>('1')

  useEffect(() => {
    const slider: target = document.querySelector('#kt_toolbar_slider') as target
    const rangeSliderValueElement: Element | null = document.querySelector(
      '#kt_toolbar_slider_value'
    )

    if (!slider) {
      return
    }

    slider.innerHTML = ''

    noUiSlider.create(slider, {
      start: [5],
      connect: [true, false],
      step: 1,
      range: {
        min: [1],
        max: [10],
      },
    })

    slider.noUiSlider?.on('update', function (values: any, handle: any) {
      if (!rangeSliderValueElement) {
        return
      }

      rangeSliderValueElement.innerHTML = parseInt(values[handle]).toFixed(1)
    })
  }, [])

  return (
    <div className='toolbar d-flex align-items-stretch'>
      {/* begin::Toolbar container */}
      <div
        className={`${classes.headerContainer.join(
          ' '
        )} py-6 py-lg-0 d-flex flex-column flex-lg-row align-items-lg-stretch justify-content-lg-between`}
      >
        <DefaultTitle />
        <div className='d-flex align-items-stretch overflow-auto pt-3 pt-lg-0'>




          {/* begin::Action wrapper */}
          <div className='d-flex align-items-center'>


            {/* begin::Actions */}
            <div className='d-flex'>




              {/* begin::Quick links */}
              <div className='d-flex align-items-center  me-5'>
                {/* begin::Menu wrapper */}
                <Link
                  to='/notifications'
                  className='btn btn-sm btn-icon btn-icon-muted btn-active-icon-primary position-relative'
                >
                  <KTIcon iconName='notification-on' className='fs-1' />
                  <span className='position-absolute top-0 start-100 translate-middle  badge badge-circle badge-danger border-none'>
                    99+
                  </span>
                </Link>
                {/* end::Menu wrapper */}
              </div>
              {/* end::Quick links */}

              {/* begin::Theme mode */}
              <div className='d-flex align-items-center'>
                <ThemeModeSwitcher toggleBtnClass='btn btn-sm btn-icon btn-icon-muted btn-active-icon-primary' />
              </div>
              {/* end::Theme mode */}
            </div>
            {/* end::Actions */}
          </div>
          {/* end::Action wrapper */}
        </div>
        {/* end::Toolbar container */}
      </div>
    </div>
  )
}

export { HeaderToolbar }
