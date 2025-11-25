import React, { useState, useCallback, useRef, useEffect } from 'react'
import { PageTitle } from '../../../_metronic/layout/core'
import {
  GoogleMap,
  DrawingManager,
  StandaloneSearchBox,
  Polygon,
} from '@react-google-maps/api'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useGoogleMaps } from '../../../hooks/useGoogleMaps' // ✅ shared loader hook

const API_URL = `${import.meta.env.VITE_APP_API_URL}/create-location`

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px',
}

const defaultCenter = { lat: 25.1972, lng: 55.2744 } // Dubai

// ✅ Bootstrap-based color options
const colorOptions = [
  { value: 'bg-primary', label: 'Blue' },
  { value: 'bg-danger', label: 'Red' },
  { value: 'bg-success', label: 'Green' },
  { value: 'bg-warning', label: 'Yellow' },
  { value: 'bg-info', label: 'Purple' },
  { value: 'bg-dark', label: 'Black' },
]



const metronicColorToHex = (className: string): string => {
  switch (className) {
    case 'bg-primary': return '#009EF7'
    case 'bg-danger': return '#F1416C'
    case 'bg-success': return '#50CD89'
    case 'bg-warning': return '#FFC700'
    case 'bg-info': return '#7239EA'
    case 'bg-dark': return '#181C32'
    default: return className // fallback if already a hex or custom color
  }
}


const CreateLocation: React.FC = () => {
  const { isLoaded, loadError } = useGoogleMaps()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    camera_user: '',
    camera_pass: '',
    border_color: 'bg-primary',
    fill_color: 'bg-warning',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [boundary, setBoundary] = useState<any[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const polygonRef = useRef<google.maps.Polygon | null>(null)
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null)
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)
  const token = localStorage.getItem('token')

  // --- Validate form ---
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (boundary.length < 3) newErrors.boundary = 'Please draw a valid boundary (at least 3 points)'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // --- Handle polygon drawing ---
  const handlePolygonComplete = useCallback(
    (polygon: google.maps.Polygon) => {
      if (polygonRef.current) polygonRef.current.setMap(null)
      polygonRef.current = polygon
      setIsDrawing(false)

      const path = polygon.getPath()
      const coords = Array.from({ length: path.getLength() }, (_, i) => {
        const point = path.getAt(i)
        return { lat: point.lat(), lng: point.lng() }
      })
      setBoundary(coords)

      if (drawingManagerRef.current) drawingManagerRef.current.setDrawingMode(null)

      // Update boundary when polygon is edited
      google.maps.event.addListener(polygon.getPath(), 'set_at', () =>
        updateBoundaryFromPolygon(polygon)
      )
      google.maps.event.addListener(polygon.getPath(), 'insert_at', () =>
        updateBoundaryFromPolygon(polygon)
      )

      if (errors.boundary) setErrors((prev) => ({ ...prev, boundary: '' }))
    },
    [errors]
  )

  const updateBoundaryFromPolygon = (polygon: google.maps.Polygon) => {
    const path = polygon.getPath()
    const coords = Array.from({ length: path.getLength() }, (_, i) => {
      const point = path.getAt(i)
      return { lat: point.lat(), lng: point.lng() }
    })
    setBoundary(coords)
  }

  // --- Search box ---
  const handlePlacesChanged = () => {
    const places = searchBoxRef.current?.getPlaces()
    if (!places || places.length === 0) return
    const place = places[0]
    if (place.geometry?.location && map) {
      map.panTo(place.geometry.location)
      map.setZoom(17)
      toast.info(`Showing ${place.name || 'location'}`)
    }
  }

  // --- Handle form input ---
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  // --- Start drawing mode ---
  const startDrawing = () => {
    if (drawingManagerRef.current) {
      if (polygonRef.current) {
        polygonRef.current.setMap(null)
        polygonRef.current = null
        setBoundary([])
      }
      setIsDrawing(true)
      drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON)
      toast.info('Drawing mode activated. Click on the map to start drawing.')
    }
  }

  // --- Clear map ---
  const clearMap = () => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    setBoundary([])
    setIsDrawing(false)
    if (drawingManagerRef.current) drawingManagerRef.current.setDrawingMode(null)
  }

  // --- Submit form ---
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting.')
      return
    }

    try {
      setIsSubmitting(true)
      const body = new FormData()
      Object.entries(formData).forEach(([key, value]) => body.append(key, value))
      body.append('boundary', JSON.stringify(boundary))

      await axios.post(API_URL, body, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Location created successfully!')

      setFormData({
        name: '',
        description: '',
        camera_user: '',
        camera_pass: '',
        border_color: 'bg-primary',
        fill_color: 'bg-warning',
      })
      clearMap()
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to create location')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Update polygon color when color changes ---
  useEffect(() => {
    if (polygonRef.current && boundary.length > 0) {
      polygonRef.current.setOptions({
        fillColor: metronicColorToHex(formData.fill_color),
        strokeColor: metronicColorToHex(formData.border_color),
      })
    }
  }, [formData.border_color, formData.fill_color, boundary])

  if (loadError) return <div className='alert alert-danger'>Error loading Google Maps</div>
  if (!isLoaded)
    return (
      <div className='d-flex justify-content-center my-5'>
        <div className='spinner-border text-primary'></div>
      </div>
    )

  // --- Render ---
  return (
    <>
      <PageTitle breadcrumbs={[]}>Create Location</PageTitle>

      <div className='card'>
        <div className='card-header border-0 pt-6'>
          <div className='card-title'>
            <h3 className='fw-bolder m-0'>Create New Location</h3>
          </div>
        </div>

        <div className='card-body'>
          {/* === FORM === */}
          <div className='mb-8'>
            <h4 className='fs-5 fw-bold mb-4'>Location Details</h4>
            <div className='row mb-5'>
              <div className='col-md-6'>
                <label className='form-label required'>Name</label>
                <input
                  name='name'
                  type='text'
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder='Enter location name'
                />
                {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label'>Description</label>
                <textarea
                  name='description'
                  className='form-control'
                  rows={1}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder='Enter optional description'
                />
              </div>
            </div>

            <h4 className='fs-5 fw-bold mb-4'>Camera Credentials</h4>
            <div className='row mb-5'>
              <div className='col-md-6'>
                <label className='form-label'>Camera Username</label>
                <input
                  name='camera_user'
                  type='text'
                  className='form-control'
                  value={formData.camera_user}
                  onChange={handleChange}
                  placeholder='Enter camera username'
                />
              </div>
              <div className='col-md-6'>
                <label className='form-label'>Camera Password</label>
                <input
                  name='camera_pass'
                  type='password'
                  className='form-control'
                  value={formData.camera_pass}
                  onChange={handleChange}
                  placeholder='Enter camera password'
                />
              </div>
            </div>

            <h4 className='fs-5 fw-bold mb-4'>Boundary Appearance</h4>
            <div className='row mb-5'>
              <div className='col-md-6'>
                <label className='form-label'>Border Color</label>
                <div className='d-flex gap-3 align-items-center'>
                  <select
                    name='border_color'
                    className='form-select'
                    value={formData.border_color}
                    onChange={handleChange}
                  >
                    {colorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: metronicColorToHex(formData.border_color),
                      border: '1px solid #E4E6EF',
                      borderRadius: 4,
                    }}
                  ></div>
                </div>
              </div>

              <div className='col-md-6'>
                <label className='form-label'>Fill Color</label>
                <div className='d-flex gap-3 align-items-center'>
                  <select
                    name='fill_color'
                    className='form-select'
                    value={formData.fill_color}
                    onChange={handleChange}
                  >
                    {colorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: metronicColorToHex(formData.fill_color),
                      border: '1px solid #E4E6EF',
                      borderRadius: 4,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* === MAP === */}
          <div className='mb-8'>
            <div className='d-flex justify-content-between align-items-center mb-4'>
              <h4 className='fs-5 fw-bold m-0'>Draw Location Boundary</h4>
              <div className='d-flex gap-2'>
                <button
                  type='button'
                  className={`btn btn-sm ${isDrawing ? 'btn-primary' : 'btn-light-primary'}`}
                  onClick={startDrawing}
                >
                  <i className='fas fa-draw-polygon me-1'></i> Draw Boundary
                </button>
                <button
                  type='button'
                  className='btn btn-sm btn-light-danger'
                  onClick={clearMap}
                  disabled={boundary.length === 0}
                >
                  <i className='fas fa-trash me-1'></i> Clear Map
                </button>
              </div>
            </div>

            {errors.boundary && (
              <div className='alert alert-danger d-flex align-items-center p-2 mb-2'>
                <i className='fas fa-exclamation-circle me-2'></i>
                {errors.boundary}
              </div>
            )}

            <div className='position-relative'>
              <StandaloneSearchBox
                onLoad={(ref) => (searchBoxRef.current = ref)}
                onPlacesChanged={handlePlacesChanged}
              >
                <div
                  className='input-group input-group-sm position-absolute'
                  style={{
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60%',
                    maxWidth: '400px',
                    zIndex: 10,
                  }}
                >
                  <span className='input-group-text bg-white'>
                    <i className='fas fa-search'></i>
                  </span>
                  <input
                    type='text'
                    placeholder='Search for a location...'
                    className='form-control'
                  />
                </div>
              </StandaloneSearchBox>

              <GoogleMap
                onLoad={setMap}
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={14}
                options={{
                  streetViewControl: false,
                  mapTypeControl: true,
                  mapTypeControlOptions: {
                    position: google.maps.ControlPosition.TOP_RIGHT,
                    style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                  },
                }}
              >
                <DrawingManager
                  onLoad={(dm) => {
                    drawingManagerRef.current = dm
                    dm.setDrawingMode(null)
                  }}
                  onPolygonComplete={handlePolygonComplete}
                  options={{
                    drawingControl: false,
                    polygonOptions: {
                      fillColor: metronicColorToHex(formData.fill_color),
                      fillOpacity: 0.5,
                      strokeColor: metronicColorToHex(formData.border_color),
                      strokeWeight: 2,
                      editable: true,
                      draggable: true,
                    },
                  }}
                />
                {boundary.length > 0 && (
                  <Polygon
                    paths={boundary}
                    options={{
                      fillColor: metronicColorToHex(formData.fill_color),
                      strokeColor: metronicColorToHex(formData.border_color),
                      strokeWeight: 2,
                      fillOpacity: 0.5,
                    }}
                  />
                )}
              </GoogleMap>
            </div>
          </div>

          {/* === ACTION BUTTONS === */}
          <div className='d-flex justify-content-end'>
            <button
              type='button'
              className='btn btn-primary'
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className='spinner-border spinner-border-sm me-2'></span>
                  Creating...
                </>
              ) : (
                <>
                  <i className='fas fa-save me-2'></i>
                  Create Location
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export { CreateLocation }
