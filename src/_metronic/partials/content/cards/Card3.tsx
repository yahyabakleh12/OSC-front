
import {FC} from 'react'
import {KTIcon, toAbsoluteUrl} from '../../../helpers'
import { Link } from 'react-router-dom'

type Props = {
  color?: string
  avatar?: string
  online?: boolean
  name: string
   zones: number
  locationId: number
}

const Card3: FC<Props> = ({
  color = '',
  avatar = '',
  online = false,
  name,
  zones,
  locationId,
}) => {
  return (
    <div className='card'>
      <div className='card-body d-flex flex-center flex-column p-9'>
        <div className='mb-5'>
          <div className='symbol symbol-75px symbol-circle'>
            {color ? (
              <span className={`symbol-label bg-light-${color} text-uppercase text-${color} fs-5 fw-bolder`}>
                {name.charAt(0)}
              </span>
            ) : (
              <img alt='Pic' src={toAbsoluteUrl(avatar)} />
            )}
            {online && (
              <div className='symbol-badge bg-success start-100 top-100 border-4 h-15px w-15px ms-n3 mt-n3'></div>
            )}
          </div>
        </div>

        <Link to={`/locations/${locationId}`} className='fs-4 text-gray-800 text-hover-primary fw-bolder mb-0'>
          {name}
        </Link>

        <div className='fs-6 text-gray-500 fw-bold mt-1 mb-5'>
         {zones} {zones === 1 ? 'Zone' : 'Zones'}
        </div>
        <div className='d-flex flex-center gap-2'>

          <Link to='/locations/map' className='btn btn-sm btn-light-primary'>
              
          View Map
        </Link>
          <Link to={`/locations/${locationId}/zones`} className='btn btn-sm btn-outline btn-outline-dashed btn-outline-primary btn-active-light-primary'>
            Zones
          </Link>
        </div>
      </div>
    </div>
  )
}

export {Card3}
