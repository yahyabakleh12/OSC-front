import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { PageTitle } from '../../../_metronic/layout/core'
import { Card3 } from '../../../_metronic/partials/content/cards/Card3'
import { getLocations, getZones } from '../../modules/auth/core/_requests'
import { useNavigate, useSearchParams } from 'react-router-dom'
import io, { type Socket } from 'socket.io-client'

import { toast } from 'react-toastify'

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000'

const Locations = () => {
  const intl = useIntl()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Pagination + data
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const [page, setPage] = useState(initialPage)
  const [locations, setLocations] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<any>(null)
  const [total, setTotal] = useState(0)

  const token = localStorage.getItem('token') || ''

  // --- Fetch Data ---
  const fetchData = async (pageNum = 1) => {
    try {
      setLoading(true)
      const [locRes, zoneRes] = await Promise.all([
        getLocations(token, pageNum),
        getZones(token),
      ])

      setLocations(locRes.data.data || [])
      setZones(zoneRes.data.data || [])
      setPagination(locRes.data.links)
      setTotal(locRes.data.total || 0)
    } catch (err: any) {
      console.error('Error fetching data:', err)
      toast.error('Failed to load locations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

useEffect(() => {
  if (!token) return

  const socket = io(API_URL, {
    transports: ['websocket'],
    query: { token },
  })

  fetchData(page)

  socket.on('locationsUpdated', () => fetchData(page))
  socket.on('zonesUpdated', () => fetchData(page))

  return () => {
    socket.disconnect()
  }
}, [page, token])


  // --- Pagination ---
  const handlePageChange = (newPage: number) => {
    if (!pagination) return
    if (newPage < 1 || newPage > pagination.pageCount) return
    setPage(newPage)
    setSearchParams({ page: newPage.toString() })
  }

  // --- Derived data ---
  const getZoneCount = (locationId: number) =>
    zones.filter((z) => z.location_id === locationId).length

  const itemsPerPage = pagination ? Math.ceil(total / pagination.pageCount) : 0
  const start = pagination ? (page - 1) * itemsPerPage + 1 : 0
  const end = pagination ? Math.min(page * itemsPerPage, total) : 0

  // --- Empty state ---
  const EmptyState = () => (
    <div className='card shadow-none border-0'>
      <div className='card-body p-10 p-lg-15 text-center'>
        <div className='text-center px-4'>
          <img
            src='/media/illustrations/sketchy-1/5.png'
            className='mw-100 mh-400px'
            alt='No locations found'
          />
          <div className='mt-5'>
            <h1 className='fw-bold text-gray-900 mb-5'>No Locations Found</h1>
            <div className='fs-4 text-gray-600 mb-7'>
              Looks like you haven’t created any locations yet.
              <br />
              Start by creating your first location to organize your zones.
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // --- Loading ---
  if (loading)
    return (
      <div className='d-flex justify-content-center align-items-center' style={{ height: '60vh' }}>
        <div className='spinner-border text-primary'></div>
        <span className='ms-3 fw-semibold'>Loading locations...</span>
      </div>
    )

  // --- Render ---
  return (
    <>
      <PageTitle breadcrumbs={[]}>
        {intl.formatMessage({ id: 'MENU.LOCATIONS', defaultMessage: 'Locations' })}
      </PageTitle>

      <div className='d-flex flex-wrap flex-stack mb-6'>
        {locations.length > 0 && (
          <h3 className='fw-bolder my-2'>
            All Locations ({locations.length})
          </h3>
        )}
      </div>

      {locations.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className='row g-6 g-xl-9'>
            {locations.map((loc: any) => (
              <div
                className='col-md-6 col-xxl-4'
                key={loc.id}
                onClick={() => navigate(`/locations/${loc.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <Card3
                  color={
                    ['danger', 'primary', 'success', 'warning', 'info'][
                      Math.floor(Math.random() * 5)
                    ]
                  }
                  name={loc.name}
                  zones={getZoneCount(loc.id)}
                  locationId={loc.id}
                />
              </div>
            ))}
          </div>

          {pagination && (
            <div className='d-flex flex-stack flex-wrap pt-10'>
              <div className='fs-6 fw-bold text-gray-700'>
                Showing {start} to {end} of {total} entries
              </div>

              <ul className='pagination'>
                <li className={`page-item previous ${page === 1 ? 'disabled' : ''}`}>
                  <a
                    href='#'
                    className='page-link'
                    onClick={(e) => {
                      e.preventDefault()
                      handlePageChange(page - 1)
                    }}
                  >
                    <i className='previous'></i>
                  </a>
                </li>

                {pagination.pages.map((p: number) => (
                  <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                    <a
                      href='#'
                      className='page-link'
                      onClick={(e) => {
                        e.preventDefault()
                        handlePageChange(p)
                      }}
                    >
                      {p}
                    </a>
                  </li>
                ))}

                <li
                  className={`page-item next ${
                    page === pagination.pageCount ? 'disabled' : ''
                  }`}
                >
                  <a
                    href='#'
                    className='page-link'
                    onClick={(e) => {
                      e.preventDefault()
                      handlePageChange(page + 1)
                    }}
                  >
                    <i className='next'></i>
                  </a>
                </li>
              </ul>
            </div>
          )}
        </>
      )}
    </>
  )
}

export { Locations }
