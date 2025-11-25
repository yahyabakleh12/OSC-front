import React from 'react'
import { KTIcon } from '../../../../_metronic/helpers'
import { useNavigate } from 'react-router-dom'
import { deleteLocation } from '../../../modules/auth/core/_requests'
import Swal from 'sweetalert2'

type Props = {
  name: string
  description?: string
  zoneCount: number
  totalParkings?: number
  freeSpace?: number
  occupancy?: number
  locationId: number
}

const LocationHeader: React.FC<Props> = ({
  name,
  description,
  zoneCount,
  totalParkings = 0,
  freeSpace = 0,
  occupancy = 0,
  locationId,
}) => {
  const navigate = useNavigate()
  const token = localStorage.getItem('token') || ''

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: `Are you sure you want to delete "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        confirmButton: 'btn btn-danger',
        cancelButton: 'btn btn-secondary'
      },
      buttonsStyling: false,
    })

    if (!result.isConfirmed) return

    try {
      await deleteLocation(token, locationId)
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: `${name} has been deleted successfully.`,
        showConfirmButton: false,
        timer: 1500,
      })
      navigate('/locations')
    } catch (err: any) {
      console.error(err)
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: err.response?.data?.message || 'Failed to delete location.',
      })
    }
  }

  return (
    <div className='card mb-5 mb-xl-10'>
      <div className='card-body pt-9 pb-0'>
        <div className='d-flex flex-wrap flex-sm-nowrap mb-3'>
          <div className='me-7 mb-4'>
            <div className='symbol symbol-100px symbol-lg-160px symbol-fixed position-relative'>
              <div className='symbol-label fs-1 fw-bold bg-primary text-inverse-primary'>{name.charAt(0)}</div>
            </div>
          </div>

          <div className='flex-grow-1'>
            <div className='d-flex justify-content-between align-items-start flex-wrap mb-2'>
              <div className='d-flex flex-column'>
                <div className='d-flex align-items-center mb-2'>
                  <span className='text-gray-800 fs-2 fw-bolder me-1'>{name}</span>
                </div>
              </div>

              <div className='d-flex my-4'>
                <button
                  type='button'
                  className='btn btn-sm btn-light-danger me-3'
                  onClick={handleDelete}
                >
                  <i className='fas fa-trash me-1'></i>
                  Delete
                </button>
              </div>
            </div>

            <div className='d-flex flex-wrap flex-stack'>
              <div className='d-flex flex-column flex-grow-1 pe-8'>
                <div className='d-flex flex-wrap'>
                  <div className='border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 me-6 mb-3'>
                    <div className='fs-2 fw-bolder'>{zoneCount}</div>
                    <div className='fw-bold fs-6 text-gray-500'>Zones</div>
                  </div>

                  <div className='border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 me-6 mb-3'>
                    <div className='fs-2 fw-bolder'>{totalParkings}</div>
                    <div className='fw-bold fs-6 text-gray-500'>Total Parkings</div>
                  </div>

                  <div className='border border-gray-300 border-dashed rounded min-w-125px py-3 px-4 me-6 mb-3'>
                    <div className='fs-2 fw-bolder'>{freeSpace}</div>
                    <div className='fw-bold fs-6 text-gray-500'>Free Space</div>
                  </div>
                </div>
              </div>

              <div className='d-flex align-items-center w-200px w-sm-300px flex-column mt-3'>
                <div className='d-flex justify-content-between w-100 mt-auto mb-2'>
                  <span className='fw-bold fs-6 text-gray-500'>Parking Occupancy</span>
                  <span className='fw-bolder fs-6'>{occupancy}%</span>
                </div>
                <div className='h-5px mx-3 w-100 bg-light mb-3'>
                  <div
                    className='bg-success rounded h-5px'
                    role='progressbar'
                    style={{ width: `${occupancy ? occupancy : 50}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { LocationHeader }
