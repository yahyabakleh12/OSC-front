import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { metronicColorToHex } from '../../utils/colorUtils'
import { mapContainerStyle, defaultMapOptions } from '../../utils/mapConstants'
import {KTIcon} from '../../../_metronic/helpers'
import { getLocations, getZones } from '../../modules/auth/core/_requests'
import { useIntl } from 'react-intl'
import { PageTitle } from '../../../_metronic/layout/core'
import { LocationHeader } from './sections/LocationHeader'
import { GoogleMap, Polygon, InfoWindow, Marker } from '@react-google-maps/api'
import { toast } from 'react-toastify'
import { useGoogleMaps } from '../../../hooks/useGoogleMaps'

const API_URL = import.meta.env.VITE_APP_API_URL





const LocationDetail: React.FC = () => {
  const intl = useIntl()
  const { id } = useParams()
  const token = localStorage.getItem('token') || ''

  const { isLoaded, loadError } = useGoogleMaps()

  const [location, setLocation] = useState<any>(null)
  const [zones, setZones] = useState<any[]>([])
  const [poles, setPoles] = useState<any[]>([])
  const [cameras, setCameras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null)
  const [activePoleId, setActivePoleId] = useState<number | null>(null)
  const [infoWindowPos, setInfoWindowPos] = useState<{ lat: number; lng: number } | null>(null)

  const mapRef = useRef<google.maps.Map | null>(null)
  const polygonRef = useRef<google.maps.Polygon | null>(null)

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locRes, zoneRes, poleRes, cameraRes] = await Promise.all([
          getLocations(token),
          getZones(token),
          axios.get(`${API_URL}/poles`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/cameras`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        const found = locRes.data.data.find((l: any) => l.id === Number(id))
        setLocation(found)

        // Filter only zones belonging to this location
        const zoneList = Array.isArray(zoneRes.data.data)
          ? zoneRes.data.data.filter((z: any) => z.location_id === Number(id))
          : []

        // Parse zone coordinates safely
        const processedZones = zoneList.map((zone: any) => ({
          ...zone,
          coordinates:
            typeof zone.coordinates === 'string'
              ? JSON.parse(zone.coordinates)
              : zone.coordinates,
        }))

        setZones(processedZones)

        // Filter poles that belong to zones in this location
        const zoneIds = processedZones.map((z: any) => z.id)
        const locationPoles = Array.isArray(poleRes.data.data)
          ? poleRes.data.data.filter((p: any) => zoneIds.includes(p.zone_id))
          : []

        setPoles(locationPoles)

        // Filter cameras that belong to poles in this location
        const poleIds = locationPoles.map((p: any) => p.id)
        const locationCameras = Array.isArray(cameraRes.data.data)
          ? cameraRes.data.data.filter((c: any) => poleIds.includes(c.pole_id))
          : []

        setCameras(locationCameras)
      } catch (err) {
        console.error('Error fetching location details:', err)
        toast.error('Failed to load location details')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, token])

  // --- MAP SETTINGS ---
  const getMapSettings = useCallback(() => {
    const boundary =
      location && location.boundary
        ? typeof location.boundary === 'string'
          ? JSON.parse(location.boundary)
          : location.boundary
        : []

    if (!boundary || boundary.length === 0)
      return { center: { lat: 25.1972, lng: 55.2744 }, zoom: 14 }

    const center = {
      lat: boundary.reduce((sum: number, p: any) => sum + p.lat, 0) / boundary.length,
      lng: boundary.reduce((sum: number, p: any) => sum + p.lng, 0) / boundary.length,
    }
    return { center, zoom: 16 }
  }, [location])

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map
      if (!location) return

      const boundary =
        typeof location.boundary === 'string'
          ? JSON.parse(location.boundary)
          : location.boundary || []

      if (boundary.length > 0) {
        const polygon = new google.maps.Polygon({
          paths: boundary,
          fillColor: metronicColorToHex(location.fill_color),
          strokeColor: metronicColorToHex(location.border_color),
          strokeWeight: 2,
          fillOpacity: 0.35,
        })
        polygon.setMap(map)
        polygonRef.current = polygon

        const bounds = new google.maps.LatLngBounds()
        boundary.forEach((point: any) => bounds.extend(point))
        map.fitBounds(bounds)

        google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          const currentZoom = map.getZoom() || 15
          map.setZoom(Math.min(currentZoom, 19))
        })
      }
    },
    [location]
  )

  // --- STATS ---
  const getLocationStats = useCallback(() => {
    if (!zones.length)
      return { zoneCount: 0, totalParkings: 0, freeSpace: 0, occupancy: 0 }
    const zoneCount = zones.length
    const totalParkings = zones.reduce((sum, z) => sum + (z.total_parking || 0), 0)
    const freeSpace = zones.reduce((sum, z) => sum + (z.free_space || 0), 0)
    const occupancy = totalParkings
      ? Math.round(((totalParkings - freeSpace) / totalParkings) * 100)
      : 0
    return { zoneCount, totalParkings, freeSpace, occupancy }
  }, [zones])

  // --- LOADING STATES ---
  if (loadError) {
    return <div className='alert alert-danger'>Error loading Google Maps</div>
  }

  if (loading || !isLoaded) {
    return (
      <div className='d-flex justify-content-center my-5'>
        <div className='spinner-border text-primary'></div>
      </div>
    )
  }

  if (!location) {
    return (
      <div className='card p-10 text-center'>
        <i className='fas fa-map-marker-alt text-danger fs-3x mb-5'></i>
        <h3 className='text-dark mb-2'>Location Not Found</h3>
        <p className='text-muted'>
          The requested location could not be found. Please check the ID and try again.
        </p>
        <a href='/locations' className='btn btn-sm btn-primary'>
          Return to Locations
        </a>
      </div>
    )
  }

  // --- COMPUTED DATA ---
  const { zoneCount, totalParkings, freeSpace, occupancy } = getLocationStats()
  const { center, zoom } = getMapSettings()

  const boundary =
    typeof location.boundary === 'string'
      ? JSON.parse(location.boundary)
      : location.boundary || []

  // --- RENDER ---
  return (
    <>
      <PageTitle breadcrumbs={[{ title: 'Locations', path: '/locations', isActive: false }]}>
        {intl.formatMessage({ id: 'MENU.DETAILS', defaultMessage: 'Details' })}
      </PageTitle>

      <LocationHeader
        name={location.name}
        description={location.description}
        zoneCount={zoneCount}
        totalParkings={totalParkings}
        freeSpace={freeSpace}
        occupancy={occupancy}
        locationId={location.id}
      />

      <div className='card card-xxl-stretch'>
        <div className='card-header border-0 pt-5 cursor-pointer justify-content-between'>
          <div className='card-title'>
            <h3 className='fw-bolder m-0'>Location Map</h3>
          </div>
          <div className='d-flex gap-2 align-items-center'>

                        <Link
  to={`/locations/${location.id}/cameras`}
  className='btn btn-outline btn-outline-dashed btn-outline-danger btn-active-light-danger btn-sm'
>
  <i className='fa-regular fa-camera-cctv me-1'></i> {cameras.length} Camera{cameras.length !== 1 ? 's' : ''}
</Link>



            <div className='btn btn-outline btn-outline-dashed btn-outline-info btn-active-light-info btn-sm'>
              <i className='fa-regular fa-utility-pole me-1'></i>
              {poles.length} Pole{poles.length !== 1 ? 's' : ''}
            </div>
            <div className='btn btn-outline btn-outline-dashed btn-outline-primary btn-active-light-primary btn-sm'>
              <i className='fa-regular fa-map me-1'></i>
              {zones.length} Zone{zones.length !== 1 ? 's' : ''}
            </div>





            <Link to={`/locations/edit/${location.id}`} className='btn btn-primary btn-sm ms-5'>
              <i className='fas fa-edit me-2'></i>Edit Location
            </Link>
          </div>
        </div>

        <div className='card-body'>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={zoom}
            onLoad={handleMapLoad}
            options={defaultMapOptions}
          >
            {/* Main location boundary */}
            {boundary.length > 0 && (
              <Polygon
                paths={boundary}
                options={{
                  fillColor: metronicColorToHex(location.fill_color),
                  strokeColor: metronicColorToHex(location.border_color),
                  strokeWeight: 2,
                  fillOpacity: 0.35,
                }}
              />
            )}

            {/* Render zones on the map */}
            {zones.map((zone) => {
              const coordinates =
                typeof zone.coordinates === 'string'
                  ? JSON.parse(zone.coordinates)
                  : zone.coordinates

              if (!coordinates || coordinates.length === 0) return null

              const isActive = activeZoneId === zone.id
              const zoneCenter = {
                lat: coordinates.reduce((sum: number, c: any) => sum + c.lat, 0) / coordinates.length,
                lng: coordinates.reduce((sum: number, c: any) => sum + c.lng, 0) / coordinates.length,
              }

              return (
                <React.Fragment key={zone.id}>
                  <Polygon
                    paths={coordinates}
                    options={{
                      fillColor: metronicColorToHex(zone.fill_color || 'bg-danger'),
                      strokeColor: metronicColorToHex(zone.border_color || 'bg-danger'),
                      strokeWeight: isActive ? 3 : 2,
                      fillOpacity: isActive ? 0.55 : 0.4,
                      zIndex: isActive ? 3 : 2,
                    }}
                    onClick={() => {
                      setActiveZoneId(zone.id)
                      setActivePoleId(null)
                      setInfoWindowPos(zoneCenter)
                    }}
                  />
                </React.Fragment>
              )
            })}

            {/* Render poles on the map */}
            {poles.map((pole) => {
              const isActive = activePoleId === pole.id
              const poleZone = zones.find((z) => z.id === pole.zone_id)

              return (
                <React.Fragment key={pole.id}>
                  <Marker
                    position={{ lat: Number(pole.lat), lng: Number(pole.lng) }}
                    title={`Pole: ${pole.code}`}
                    icon={{
                      url: isActive
                        ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                        : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                      scaledSize: new google.maps.Size(isActive ? 40 : 32, isActive ? 40 : 32),
                    }}
                    onClick={() => {
                      setActivePoleId(pole.id)
                      setActiveZoneId(null)
                      setInfoWindowPos({ lat: Number(pole.lat), lng: Number(pole.lng) })
                    }}
                  />

                  {isActive && infoWindowPos && (
                    <InfoWindow
                      position={infoWindowPos}
                      onCloseClick={() => {
                        setActivePoleId(null)
                        setInfoWindowPos(null)
                      }}
                      options={{
                        disableAutoPan: false,
                        pixelOffset: new window.google.maps.Size(0, -35),
                      }}
                    >
                      <div className='card shadow-sm border-0 position-relative' style={{ minWidth: '220px' }}>
                        <button
                          type='button'
                          className='btn btn-icon btn-sm btn-light position-absolute top-0 end-0 m-2'
                          onClick={() => {
                            setActivePoleId(null)
                            setInfoWindowPos(null)
                          }}
                          style={{ zIndex: 10 }}
                        >
                          <KTIcon iconName='cross' className='fs-2x text-muted' />
                        </button>

                        <div className='card-body p-5'>
                          <div className='d-flex align-items-center mb-2'>
                            <KTIcon iconName='flag' className='fs-5 text-muted me-3' />
                            <div className='mb-0 fs-5 text-dark text-uppercase'>{pole.code}</div>
                          </div>

                          <div className='d-flex align-items-center mb-2'>
                            <KTIcon iconName='pointers' className='fs-5 text-muted me-3' />
                            <div className='mb-0 fs-5 text-dark'>Zone: {poleZone?.name || 'Unknown'}</div>
                          </div>

                          {pole.router_ip && (
                            <div className='d-flex align-items-center mb-2'>
                              <KTIcon iconName='switch' className='fs-5 text-muted me-3' />
                              <div className='mb-0 fs-5 text-dark'>Router IP: {pole.router_ip}</div>
                            </div>
                          )}

                          {pole.router_vpn_ip && (
                            <div className='d-flex align-items-center mb-2'>
                              <KTIcon iconName='lock' className='fs-5 text-muted me-3' />
                              <div className='mb-0 fs-5 text-dark'>VPN IP: {pole.router_vpn_ip}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </React.Fragment>
              )
            })}
          </GoogleMap>
        </div>
      </div>

      {/* Poles List Card - Grouped by Zone */}
      {poles.length > 0 && (
        <div className='card card-xxl-stretch mt-5'>
          <div className='card-header border-0 pt-5'>
            <h3 className='card-title align-items-start flex-column'>
              <span className='card-label fw-bold fs-3 mb-1'>Poles & Cameras</span>
              <span className='text-muted mt-1 fw-semibold fs-7'>
                {poles.length} poles, {cameras.length} cameras
              </span>
            </h3>
          </div>
          <div className='card-body p-0'>
            {zones.map((zone) => {
              const zonePoles = poles.filter((p) => p.zone_id === zone.id)
              if (zonePoles.length === 0) return null

              return (
                <div key={zone.id} className='mb-5'>
                  {/* Zone Header */}
                  <div className='bg-light-success px-7 py-4 d-flex align-items-center justify-content-between'>
                    <div className='d-flex align-items-center'>
                      <KTIcon iconName='geolocation' className='fs-2x text-success me-3' />
                      <div>
                        <h5 className='fw-bold mb-0'>{zone.name}</h5>
                        <span className='text-muted fs-7'>{zonePoles.length} pole{zonePoles.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className='d-flex align-items-center gap-2'>
                      <div
                        className='border-none'
                        style={{
                          width: '1.25rem',
                          height: '1.25rem',
                          backgroundColor: metronicColorToHex(zone.border_color || 'bg-success'),
                          borderRadius: '50%',
                        }}
                      ></div>
                      <div
                        className='border-none'
                        style={{
                          width: '1.25rem',
                          height: '1.25rem',
                          backgroundColor: metronicColorToHex(zone.fill_color || 'bg-success'),
                          borderRadius: '50%',
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Poles & Cameras Table */}
                  <div className='table-responsive'>
                    <table className='table table-row-gray-300 align-middle gs-0 gy-3 mb-0'>
                      <thead>
                        <tr className='fw-bold text-muted bg-light'>
                          <th className='ps-7'>Pole Code</th>
                          <th>Router IP</th>
                          <th>VPN IP</th>
                          <th>Location</th>
                          <th>Cameras</th>
                          <th className='text-end pe-7'>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zonePoles.map((pole) => {
                          const poleCameras = cameras.filter((c) => c.pole_id === pole.id)
                          return (
                            <React.Fragment key={pole.id}>
                              <tr className='border-bottom border-gray-300'>
                                <td className='ps-7'>
                                  <div className='d-flex align-items-center'>
                                    <KTIcon iconName='flag' className='fs-3 text-primary me-2' />
                                    <span className='text-dark fw-bold text-hover-primary fs-6'>{pole.code}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className='text-gray-900 fw-bold text-hover-primary fs-6'>
                                    {pole.router_ip || '-'}
                                  </span>
                                </td>
                                <td>
                                  <span className='text-gray-900 fw-bold text-hover-primary fs-6'>
                                    {pole.router_vpn_ip || '-'}
                                  </span>
                                </td>
                                <td>
                                  <span className='text-gray-900 fw-bold text-hover-primary fs-6'>
                                    {Number(pole.lat).toFixed(4)}, {Number(pole.lng).toFixed(4)}
                                  </span>
                                </td>
                                <td>
                                  <span className='text-primary fw-bold fs-6'>
                                    {poleCameras.length} camera{poleCameras.length !== 1 ? 's' : ''}
                                  </span>
                                </td>
                                <td className='text-end pe-7'>
                                  <button
                                    className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                                    onClick={() => {
                                      setActivePoleId(pole.id)
                                      setActiveZoneId(null)
                                      setInfoWindowPos({ lat: Number(pole.lat), lng: Number(pole.lng) })
                                      
                                      mapRef.current?.panTo({ lat: Number(pole.lat), lng: Number(pole.lng) })
                                      mapRef.current?.setZoom(19)
                                    }}
                                    title='View on map'
                                  >
                                    <KTIcon iconName='geolocation' className='fs-3' />
                                  </button>
                                </td>
                              </tr>
                              {/* Camera rows */}
                              {poleCameras.map((camera) => (
                                <tr key={`camera-${camera.id}`} className='bg-light-warning'>
                                  <td className='ps-12'>
                                    <div className='d-flex align-items-center'>
                                      <i className='fa-regular fa-camera-cctv me-2 text-primary'></i>
                                      <span className='text-muted fw-semibold'>Camera</span>
                                    </div>
                                  </td>
                                  <td colSpan={2}>
                                    <span className='text-gray-900 fw-bold'>{camera.camera_ip}</span>
                                  </td>
                                  <td>
                                    <span className='btn btn-outline btn-outline-dashed btn-outline-info btn-active-light-info btn-sm'>
                                      {camera.number_of_parking} parking spots
                                    </span>
                                  </td>
                                  <td colSpan={2}></td>
                                </tr>
                              ))}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

export { LocationDetail }