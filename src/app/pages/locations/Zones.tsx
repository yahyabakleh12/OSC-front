import { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { useParams, useLocation } from 'react-router-dom'
import { PageTitle } from '../../../_metronic/layout/core'
import { getZones } from '../../modules/auth/core/_requests'

const Zones = () => {
    const intl = useIntl()
  const { id } = useParams<{ id: string }>()
  const { state } = useLocation()
  const [zones, setZones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const locationName = state?.locationName || 'Location'

  useEffect(() => {
    const token = localStorage.getItem('token') || ''
    if (!token || !id) return

    // ✅ Pass locationId to the API
    getZones(token, Number(id))
      .then((res) => {
        const allZones = res.data.data

        // ✅ If backend ignores the query param, filter manually just in case
        const filtered = allZones.filter(
          (z: any) => Number(z.location_id) === Number(id)
        )

        setZones(filtered)
      })
      .catch((err) => console.error('Error fetching zones:', err))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div>Loading zones...</div>

  return (
    <>
      <PageTitle breadcrumbs={[ { title: 'Locations', path: '/locations', isActive: false }] }>
        {intl.formatMessage({ id: 'MENU.ZONES', defaultMessage: 'Zones' })}
      </PageTitle>

      <div className='mb-6'>
        <h3 className='d-flex flex-column'>
          <span className="card-label fw-bold fs-3 mb-1">Zones ({zones.length})</span>
          <span className="text-muted mt-1 fw-semibold fs-5">{locationName}</span>
        </h3>
      </div>

      <div className='row g-6 g-xl-9'>
        {zones.length > 0 ? (
          zones.map((zone) => (
            <div className='col-md-6 col-xxl-4' key={zone.id}>
              <div className='card p-4'>
                <h5 className='text-dark fw-bold mb-2'>{zone.name}</h5>
                <p className='text-muted mb-0'>Location ID: {zone.location_id}</p>
              </div>
            </div>
          ))
        ) : (
          <p className='text-muted'>No zones found for this location.</p>
        )}
      </div>
    </>
  )
}

export { Zones }
