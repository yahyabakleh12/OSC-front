import {useIntl} from 'react-intl'
import {PageTitle} from '../../../_metronic/layout/core'

const DashboardWrapper = () => {
  const intl = useIntl()
  return (
    <>
      <PageTitle breadcrumbs={[]}>{intl.formatMessage({id: 'MENU.DASHBOARD'})}</PageTitle>
      <div>Dashboard Content</div>
    </>
  )
}

export {DashboardWrapper}
