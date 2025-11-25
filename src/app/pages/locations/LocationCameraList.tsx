import React, { useEffect, useState } from 'react'
import axios from 'axios'
import io, { type Socket } from 'socket.io-client'


import { PageTitle } from '../../../_metronic/layout/core'
import { KTIcon } from '../../../_metronic/helpers'
import { toast } from 'react-toastify'
import { Link, useParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_APP_API_URL
const SOCKET_URL = import.meta.env.VITE_APP_SOCKET_URL

// 🔹 Status badge
const StatusBadge = ({ status }: { status: any }) => {
  const numericStatus = Number(status)
  if (numericStatus === 1)
    return (
      <span className='badge badge-light-success fw-bold'>
        <i className='fas fa-circle me-1 text-success'></i> Online
      </span>
    )
  if (numericStatus === 0)
    return (
      <span className='badge badge-light-danger fw-bold'>
        <i className='fas fa-circle me-1 text-danger'></i> Offline
      </span>
    )
  return (
    <span className='badge badge-light-secondary fw-bold'>
      <i className='fas fa-circle me-1 text-muted'></i> Unknown
    </span>
  )
}

export const LocationCameraList: React.FC = () => {
  const { id } = useParams()
  const token = localStorage.getItem('token') || ''
  const [cameraData, setCameraData] = useState<any[]>([])
  const [poleStatusData, setPoleStatusData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [socketId, setSocketId] = useState<string | null>(null)
  const [resources, setResources] = useState<any | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loadingPole, setLoadingPole] = useState<string | null>(null)
  // const [socket, setSocket] = useState<Socket | null>(null)
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null)


  // 🚀 Initial fetch for poles & cameras
  useEffect(() => {
    const fetchData = async () => {
      try {
        const cameraRes = await axios.get(`${API_URL}/cameras`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const allCameras = cameraRes.data?.data || []

        const poleRes = await axios.get(`${API_URL}/poles_with_status`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
        const poles = poleRes.data?.data || poleRes.data || []
        setPoleStatusData(poles)

        // fetch camera statuses by pole code
       const uniquePoleCodes = [...new Set(allCameras.map((c: any) => c.pole_code))]
        const statusPromises = uniquePoleCodes.map((code) =>
          axios
            .get(`${API_URL}/cameras_with_status/${code}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => ({ code, data: res.data }))
            .catch(() => ({ code, data: [] }))
        )
        const allStatuses = await Promise.all(statusPromises)

        const merged = allCameras.map((cam: any) => {
          const group = allStatuses.find((g) => g.code === cam.pole_code)
          const match = group?.data?.find((c: any) => c.camera_ip === cam.camera_ip)
          return { ...cam, status: match?.status ?? null }
        })
        setCameraData(merged)

        // After fetching cameras, join socket rooms
        setTimeout(() => {
          if (socket) {
            uniquePoleCodes.forEach((code) => {
              socket.emit('frontJoinToPoleCode', code)
            })
          }
        }, 1000)
      } catch (err) {
        console.error('Error fetching data:', err)
        toast.error('Failed to load camera or pole data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token, socket])

  // ⚡ Socket.IO live updates
  useEffect(() => {
    const s = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    setSocket(s)

    s.on('connect', () => {
      console.log('✅ Socket connected:', s.id)
      setSocketId(s.id)
    })

    // 🔹 Pole status updates
    s.on('sendCloudFront', (data: any[]) => {
      setPoleStatusData((prev) => {
        const updated = [...prev]
        data.forEach((newPole) => {
          const index = updated.findIndex((p) => p.code === newPole.code)
          if (index >= 0) updated[index] = { ...updated[index], status: newPole.status }
          else updated.push(newPole)
        })
        return updated
      })
    })

    // 🔹 Camera updates via `showCameras`
    s.on('showCameras', (data: any[]) => {
      setCameraData((prev) => {
        const updated = [...prev]
        data.forEach((camUpdate) => {
          const matchIndex = updated.findIndex(
            (c) => c.camera_ip === camUpdate.device.camera_ip
          )
          if (matchIndex >= 0) {
            updated[matchIndex] = {
              ...updated[matchIndex],
              status: camUpdate.device.status,
            }
          }
        })
        return updated
      })
    })

    // 🔹 Resource data
    s.on('showServerBResources', (data: any) => {
      setResources(data)
      setShowModal(true)
      setLoadingPole(null)
    })

    // 🔹 Notifications
    s.on('notification', (notif: any) => {
      toast.info(`${notif.title}: ${notif.message}`)
    })

    return () => {
      s.disconnect()
    }
  }, [])

  // 🔹 Request resources
  const getResources = (pole_code: string, status: number) => {
    if (status !== 1) {
      toast.warn(`Pole ${pole_code} is offline!`)
      return
    }
    if (!socketId || !socket) {
      toast.error('Socket not connected!')
      return
    }

    setLoadingPole(pole_code)
    socket.emit('orderResources', pole_code, socketId)
  }

  // 🔹 Copy JSON
  const handleCopy = () => {
    if (!resources) return
    navigator.clipboard.writeText(JSON.stringify(resources, null, 2))
    toast.success('Copied to clipboard!')
  }

  // 🔹 Helpers
  const getPoleStatus = (poleCode: string) => {
    const pole = poleStatusData.find((p: any) => p.code === poleCode)
    return pole ? Number(pole.status) : null
  }

  // Group cameras
  const grouped = cameraData.reduce((acc: any, cam: any) => {
    const zone = cam.zone_name || 'Unknown Zone'
    if (!acc[zone]) acc[zone] = {}
    const pole = cam.pole_code || `Pole-${cam.pole_id}`
    if (!acc[zone][pole]) acc[zone][pole] = []
    acc[zone][pole].push(cam)
    return acc
  }, {})

  if (loading)
    return (
      <div className='d-flex justify-content-center my-5'>
        <div className='spinner-border text-primary'></div>
      </div>
    )

  if (!cameraData.length)
    return (
      <div className='card p-10 text-center'>
        <i className='fa-regular fa-camera-cctv fs-3x text-muted mb-4'></i>
        <h4>No Cameras Found</h4>
        <Link to={`/locations/${id}`} className='btn btn-primary btn-sm mt-3'>
          Back to Location
        </Link>
      </div>
    )

  return (
    <>
<PageTitle breadcrumbs={[{ title: 'Locations', path: '/locations', isActive: false }]}>
  Cameras (Live)
</PageTitle>


      <div className='card'>
        <div className='card-header border-0 pt-5 d-flex justify-content-between align-items-center'>
          <h3 className='card-title m-0'>Camera & Pole Status (Live)</h3>
          <Link to={`/locations/${id}`} className='btn btn-light btn-sm'>
            <KTIcon iconName='arrow-left' className='fs-3 me-2' />
            Back to Location
          </Link>
        </div>

        <div className='card-body'>
          {Object.entries(grouped).map(([zoneName, poles]: any) => (
            <div key={zoneName} className='mb-7 border rounded'>
              <div className='bg-light-primary px-5 py-3 d-flex justify-content-between align-items-center'>
                <h5 className='fw-bold mb-0'>{zoneName}</h5>
              </div>

              {Object.entries(poles).map(([poleCode, cameras]: any) => {
                const poleStatus = getPoleStatus(poleCode)
                return (
                  <div key={poleCode} className='px-5 py-4 border-top'>
                    <div className='d-flex align-items-center mb-3 justify-content-between'>
                      <div className='d-flex align-items-center'>
                        <KTIcon iconName='flag' className='fs-2 text-primary me-2' />
                        <h6 className='fw-bold mb-0'>
                          Pole: {poleCode}{' '}
                          <span className='ms-3'>
                            <StatusBadge status={poleStatus} />
                          </span>
                        </h6>
                      </div>

                      {poleStatus === 1 && (
                        <button
                          className={`btn btn-sm btn-primary ${
                            loadingPole === poleCode ? 'disabled' : ''
                          }`}
                          onClick={() => getResources(poleCode, poleStatus)}
                        >
                          {loadingPole === poleCode ? (
                            <span className='indicator-progress' style={{ display: 'block' }}>
                              Loading...{' '}
                              <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                            </span>
                          ) : (
                            'Get Resources'
                          )}
                        </button>
                      )}
                    </div>

                    <div className='table-responsive'>
                      <table className='table table-row-gray-300 align-middle gs-0 gy-3'>
                        <thead>
                          <tr className='fw-bold text-muted bg-light'>
                            <th>Camera IP</th>
                            <th>Parking Spots</th>
                            <th>Router IP</th>
                            <th>VPN IP</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cameras.map((camera: any) => (
                            <tr key={camera.id}>
                              <td>{camera.camera_ip}</td>
                              <td>{camera.number_of_parking}</td>
                              <td>{camera.pole_router_ip}</td>
                              <td>{camera.pole_router_vpn_ip}</td>
                              <td>
                                <StatusBadge status={camera.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 🔍 Modal */}
      {showModal && (
        <div
          className='modal fade show'
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          role='dialog'
        >
          <div className='modal-dialog modal-lg'>
            <div className='modal-content'>
              <div className='modal-header'>
                <h5 className='modal-title'>
                  Resources for {resources?.pole_code || 'Unknown Pole'}
                </h5>
                <button
                  type='button'
                  className='btn-close'
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className='modal-body'>
                <pre
                  style={{
                    background: '#f9f9f9',
                    padding: '15px',
                    borderRadius: '5px',
                    maxHeight: '60vh',
                    overflowY: 'auto',
                  }}
                >
                  {JSON.stringify(resources, null, 2)}
                </pre>
              </div>
              <div className='modal-footer'>
                <button className='btn btn-secondary' onClick={() => setShowModal(false)}>
                  Close
                </button>
                <button
                  className='btn btn-outline btn-outline-dashed btn-outline-default'
                  onClick={handleCopy}
                >
                  Copy JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
