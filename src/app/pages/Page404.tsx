import React from 'react'
import { Link } from 'react-router-dom'
import { toAbsoluteUrl } from '../../_metronic/helpers/AssetHelpers';

const Page404: React.FC = () => {
  return (
    <div className='d-flex flex-column align-items-center justify-content-center h-100'>
      <img src={toAbsoluteUrl('media/misc/404.svg')} alt="404" className="mb-5 h-150px" />
      <h1 className='text-gray-900 fw-bolder fs-2qx mb-5'>Oops, Sorry we can't find that page !</h1>
      <h4 className='text-gray-600 fw-semibold mb-7'>The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</h4>

      <div className='text-center'>
        <Link to="/auth/login" className="btn btn-primary">
  Return to Login
</Link>
      </div>
    </div>
  )
}

export { Page404 }