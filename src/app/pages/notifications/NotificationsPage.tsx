import React, { useEffect, useState } from 'react'
import { PageTitle } from '../../../_metronic/layout/core'
import io from 'socket.io-client'
import { toast } from 'react-toastify'

const SOCKET_URL = import.meta.env.VITE_APP_SOCKET_URL

interface Notification {
  title: string
  message: string
  timestamp: Date
  type?: 'info' | 'success' | 'warning' | 'danger'
}

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Suppress extension-related errors
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('message channel closed')) {
        event.preventDefault()
        console.warn('Browser extension error suppressed')
      }
    }

    window.addEventListener('unhandledrejection', handleRejection)

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })

    socket.on('connect', () => {
      console.log('✅ Notifications socket connected:', socket.id)
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

  socket.on('notification', (notif: Notification) => {
      console.log('🔔 Notification received:', notif)
      const newNotif = {
        ...notif,
        timestamp: new Date(),
      }
      setNotifications((prev) => [newNotif, ...prev])
      toast.info(`${notif.title}: ${notif.message}`)
    })

    return () => {
      socket.disconnect()
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'success':
        return 'bi-check-circle text-success'
      case 'warning':
        return 'bi-exclamation-triangle text-warning'
      case 'danger':
        return 'bi-x-circle text-danger'
      default:
        return 'bi-info-circle text-primary'
    }
  }

  const getBadgeClass = (type?: string) => {
    switch (type) {
      case 'success':
        return 'badge-light-success'
      case 'warning':
        return 'badge-light-warning'
      case 'danger':
        return 'badge-light-danger'
      default:
        return 'badge-light-primary'
    }
  }

  const clearAll = () => {
    setNotifications([])
    toast.success('All notifications cleared')
  }

  return (
    <>
      <PageTitle breadcrumbs={[{ title: 'Dashboard', path: '/', isActive: false }]}>
        Notifications
      </PageTitle>

      <div className='card shadow-sm'>
        <div className='card-header border-0 pt-6'>
          <div className='card-title'>
            <div className='d-flex align-items-center'>
              <i className='bi bi-bell fs-2 text-primary me-3'></i>
              <div>
                <h3 className='fw-bold text-gray-900 mb-1'>System Notifications</h3>
                <span className='text-muted fw-semibold fs-7'>
                  Live updates via Socket.IO
                  <span
                    className={`ms-2 badge badge-sm ${
                      isConnected ? 'badge-light-success' : 'badge-light-danger'
                    }`}
                  >
                    <span
                      className={`bullet bullet-dot ${
                        isConnected ? 'bg-success' : 'bg-danger'
                      } me-1`}
                    ></span>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className='card-toolbar'>
            {notifications.length > 0 && (
              <button className='btn btn-sm btn-light-primary' onClick={clearAll}>
                <i className='bi bi-trash3 fs-6 me-1'></i>
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className='card-body py-4'>
          {notifications.length === 0 ? (
            <div className='text-center py-15'>
              <div className='mb-5'>
                <i className='bi bi-bell-slash fs-3x text-gray-400'></i>
              </div>
              <h4 className='fw-semibold text-gray-600 mb-2'>No notifications yet</h4>
              <p className='text-muted fs-6'>
                You'll see real-time notifications here when they arrive
              </p>
            </div>
          ) : (
            <>
              <div className='mb-5 d-flex align-items-center'>
                <span className='badge badge-light-primary fs-7 fw-bold px-3 py-2'>
                  {notifications.length} Notification{notifications.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className=''>
                {notifications.map((notif, idx) => (
                  <div
                    key={idx}
                    className='d-flex align-items-start border border-gray-300 border-dashed rounded p-5 mb-4 hover-elevate-up transition'
                    style={{ transition: 'all 0.2s ease' }}
                  >
                    <div className='me-4'>
                      <div
                        className='symbol symbol-40px symbol-circle'
                        style={{ backgroundColor: 'rgba(var(--bs-primary-rgb), 0.1)' }}
                      >
                        <i className={`bi ${getNotificationIcon(notif.type)} fs-2`}></i>
                      </div>
                    </div>

                    <div className='flex-grow-1'>
                      <div className='d-flex align-items-center justify-content-between mb-2'>
                        <h5 className='fw-bold text-gray-900 mb-0'>{notif.title || 'Notification'}</h5>
                        <span className={`badge ${getBadgeClass(notif.type)} fs-8 fw-semibold`}>
                          {notif.type?.toUpperCase() || 'INFO'}
                        </span>
                      </div>
                      <p className='text-gray-700 fs-6 mb-2'>{notif.message || '—'}</p>
                      <div className='d-flex align-items-center text-muted fs-7'>
                        <i className='bi bi-clock me-1'></i>
                        <span>
                          {notif.timestamp
                            ? new Date(notif.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : new Date().toLocaleTimeString()}
                        </span>
                        <span className='mx-2'>•</span>
                        <span>
                          {notif.timestamp
                            ? new Date(notif.timestamp).toLocaleDateString()
                            : new Date().toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}