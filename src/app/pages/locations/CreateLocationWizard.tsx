import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTitle } from '../../../_metronic/layout/core'
import { metronicColorToHex } from '../../utils/colorUtils'
import { ColorSelect } from '../../components/common/ColorSelect'
import { FormInput } from '../../components/common/FormInput'
import { isPointInPolygon, isPolygonInside } from '../../utils/polygonUtils'
import { mapContainerStyle, defaultCenter, defaultMapOptions, } from '../../utils/mapConstants'

import {
    GoogleMap,
    DrawingManager,
    StandaloneSearchBox,
    Polygon,
    Marker,
} from '@react-google-maps/api'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useGoogleMaps } from '../../../hooks/useGoogleMaps'
import { createPole } from '../../modules/auth/core/_requests'

const API_URL = import.meta.env.VITE_APP_API_URL





const CreateLocationWizard: React.FC = () => {
    const navigate = useNavigate()
    const { isLoaded, loadError } = useGoogleMaps()
    const token = localStorage.getItem('token') || ''

    // Wizard state
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Location data
    const [locationId, setLocationId] = useState<number | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        camera_user: '',
        camera_pass: '',
        border_color: 'bg-primary',
        fill_color: 'bg-warning',
    })
    const [boundary, setBoundary] = useState<{ lat: number, lng: number }[]>([])
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Zone data
    const [zones, setZones] = useState<any[]>([])
    const [zoneFormData, setZoneFormData] = useState({
        name: '',
        border_color: 'bg-success',
        fill_color: 'bg-success',
    })
    const [zoneErrors, setZoneErrors] = useState<Record<string, string>>({})
    const [isDrawingZone, setIsDrawingZone] = useState(false)
    const [newZoneCoordinates, setNewZoneCoordinates] = useState<{ lat: number, lng: number }[]>([])
    const [showZoneForm, setShowZoneForm] = useState(false)
    const [activeZone, setActiveZone] = useState<number | null>(null)

    // Pole data
    const [poles, setPoles] = useState<any[]>([])
    const [isAddingPole, setIsAddingPole] = useState(false)
    const [newPole, setNewPole] = useState<{ lat: number; lng: number } | null>(null)
    const [poleFormData, setPoleFormData] = useState({
        code: '',
        router_ip: '',
        router_vpn_ip: '',
    })
    const [poleErrors, setPoleErrors] = useState<Record<string, string>>({})

    // Map refs
    const mapRef = useRef<google.maps.Map | null>(null)
    const polygonRef = useRef<google.maps.Polygon | null>(null)
    const zonePolygonRef = useRef<google.maps.Polygon | null>(null)
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)
    const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null)

    // Step 1: Location Details Validation
    const validateStep1 = () => {
        const newErrors: Record<string, string> = {}
        if (!formData.name.trim()) newErrors.name = 'Name is required'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Step 2: Boundary Validation
    const validateStep2 = () => {
        const newErrors: Record<string, string> = {}
        if (boundary.length < 3) newErrors.boundary = 'Please draw a valid boundary (at least 3 points)'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Handle form input changes
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    }

    // Handle zone form changes
    const handleZoneChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target
        setZoneFormData(prev => ({ ...prev, [name]: value }))
        if (zoneErrors[name]) setZoneErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Handle pole form changes

    const handlePoleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target
        setPoleFormData((prev) => ({ ...prev, [name]: value }))
        if (poleErrors[name]) setPoleErrors((prev) => ({ ...prev, [name]: '' }))
    }


    // Polygon drawing for location boundary
    const handlePolygonComplete = useCallback((polygon: google.maps.Polygon) => {
        if (polygonRef.current) polygonRef.current.setMap(null)
        polygonRef.current = polygon

        const path = polygon.getPath()
        const coordinates = Array.from({ length: path.getLength() }, (_, i) => {
            const point = path.getAt(i)
            return { lat: point.lat(), lng: point.lng() }
        })
        setBoundary(coordinates)
        drawingManagerRef.current?.setDrawingMode(null)

        google.maps.event.addListener(polygon.getPath(), 'set_at', () =>
            updateBoundaryFromPolygon(polygon)
        )
        google.maps.event.addListener(polygon.getPath(), 'insert_at', () =>
            updateBoundaryFromPolygon(polygon)
        )

        if (errors.boundary) setErrors((prev) => ({ ...prev, boundary: '' }))
    }, [errors])

    const updateBoundaryFromPolygon = (polygon: google.maps.Polygon) => {
        const path = polygon.getPath()
        const coordinates = Array.from({ length: path.getLength() }, (_, i) => {
            const point = path.getAt(i)
            return { lat: point.lat(), lng: point.lng() }
        })
        setBoundary(coordinates)
    }

    // Zone polygon drawing
    const handleZonePolygonComplete = (polygon: google.maps.Polygon) => {
        if (zonePolygonRef.current) zonePolygonRef.current.setMap(null)
        zonePolygonRef.current = polygon
        setIsDrawingZone(false)

        const path = polygon.getPath()
        const coordinates = Array.from({ length: path.getLength() }, (_, i) => {
            const point = path.getAt(i)
            return { lat: point.lat(), lng: point.lng() }
        })

        if (!isPolygonInside(coordinates, boundary)) {
            toast.error('Zone must be completely inside the location boundary')
            polygon.setMap(null)
            return
        }

        setNewZoneCoordinates(coordinates)
        setShowZoneForm(true)
        drawingManagerRef.current?.setDrawingMode(null)

        google.maps.event.addListener(polygon.getPath(), 'set_at', () => {
            const updatedCoords = updateZoneFromPolygon(polygon)
            setNewZoneCoordinates(updatedCoords)
            if (!isPolygonInside(updatedCoords, boundary)) {
                toast.error('Zone must remain completely inside the location boundary')
            }
        })

        if (zoneErrors.coordinates) setZoneErrors((prev) => ({ ...prev, coordinates: '' }))
    }

    const updateZoneFromPolygon = (polygon: google.maps.Polygon) => {
        const path = polygon.getPath()
        return Array.from({ length: path.getLength() }, (_, i) => {
            const point = path.getAt(i)
            return { lat: point.lat(), lng: point.lng() }
        })
    }

    // Drawing controls
    const startDrawingBoundary = () => {
        if (drawingManagerRef.current) {
            if (polygonRef.current) polygonRef.current.setMap(null)
            polygonRef.current = null
            setBoundary([])
            drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON)
            toast.info('Draw the location boundary on the map')
        }
    }

    const startDrawingZone = () => {
        if (drawingManagerRef.current) {
            if (zonePolygonRef.current) zonePolygonRef.current.setMap(null)
            zonePolygonRef.current = null
            setIsDrawingZone(true)
            setShowZoneForm(false)
            setZoneFormData({
                name: '',
                border_color: 'bg-success',
                fill_color: 'bg-success',
            })
            drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON)
            toast.info('Draw a zone inside the location boundary')
        }
    }

    const clearBoundary = () => {
        if (polygonRef.current) polygonRef.current.setMap(null)
        polygonRef.current = null
        setBoundary([])
        drawingManagerRef.current?.setDrawingMode(null)
    }

    const clearZoneDrawing = () => {
        if (zonePolygonRef.current) zonePolygonRef.current.setMap(null)
        zonePolygonRef.current = null
        setIsDrawingZone(false)
        setShowZoneForm(false)
        setNewZoneCoordinates([])
        drawingManagerRef.current?.setDrawingMode(null)
    }

    // Search box
    const handlePlacesChanged = () => {
        const places = searchBoxRef.current?.getPlaces()
        if (!places?.length) return
        const place = places[0]
        if (place.geometry?.location && mapRef.current) {
            mapRef.current.panTo(place.geometry.location)
            mapRef.current.setZoom(17)
            toast.info(`Showing ${place.name || 'location'}`)
        }
    }

    // Submit Step 1 & 2: Create Location
    const handleCreateLocation = async () => {


        if (!validateStep2()) {
            toast.error('Please draw a valid boundary')
            return false
        }

        try {
            setIsSubmitting(true)
            const body = new FormData()
            Object.entries(formData).forEach(([key, value]) => body.append(key, value))
            body.append('boundary', JSON.stringify(boundary))

            const response = await axios.post(`${API_URL}/create-location`, body, {
                headers: { Authorization: `Bearer ${token}` },
            })


            // API returns {message, data: {insertId, affectedRows, ...}}
            if (response.data && response.data.data && response.data.data.insertId) {
                setLocationId(response.data.data.insertId)
                toast.success(response.data.message || 'Location created successfully!')
                setCurrentStep(3)
                return true
            } else {
                toast.error('Failed to create location - invalid response')
                return false
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create location')
            return false
        } finally {
            setIsSubmitting(false)
        }
    }

    // Validate zone form
    const validateZoneForm = () => {
        const newErrors: Record<string, string> = {}
        if (!zoneFormData.name.trim()) newErrors.name = 'Zone name is required'
        if (newZoneCoordinates.length < 3) {
            newErrors.coordinates = 'Please draw a valid zone (at least 3 points)'
        }
        setZoneErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Submit zone
    const handleZoneSubmit = async () => {
        if (!validateZoneForm()) {
            toast.error('Please fix zone errors')
            return
        }

        try {
            setIsSubmitting(true)
            const zoneData = new FormData()
            zoneData.append('location_id', String(locationId))
            zoneData.append('name', zoneFormData.name)
            zoneData.append('border_color', zoneFormData.border_color)
            zoneData.append('fill_color', zoneFormData.fill_color)
            zoneData.append('coordinates', JSON.stringify(newZoneCoordinates))

            const response = await axios.post(`${API_URL}/create-zone`, zoneData, {
                headers: { Authorization: `Bearer ${token}` },
            })

            // API returns {message, data: {insertId, affectedRows, ...}}
            if (response.data && response.data.data && response.data.data.insertId) {
                toast.success(response.data.message || 'Zone created successfully!')
                const newZone = {
                    id: response.data.data.insertId,
                    name: zoneFormData.name,
                    border_color: zoneFormData.border_color,
                    fill_color: zoneFormData.fill_color,
                    coordinates: newZoneCoordinates,
                }
                setZones((prev) => [...prev, newZone])

                // Reset zone form
                setZoneFormData({
                    name: '',
                    border_color: 'bg-success',
                    fill_color: 'bg-success',
                })
                if (zonePolygonRef.current) zonePolygonRef.current.setMap(null)
                zonePolygonRef.current = null
                setShowZoneForm(false)
                setNewZoneCoordinates([])
            } else {
                toast.error(response.data.message || 'Failed to create zone')
            }
        } catch (err) {
            toast.error('Failed to create zone')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Start adding pole
    const startAddingPole = () => {
        if (!activeZone) {
            toast.error('Please select a zone first by clicking on it')
            return
        }

        setIsAddingPole(true)
        setNewPole(null)
        setPoleFormData({
            code: '',
            router_ip: '',
            router_vpn_ip: '',
        })
        setPoleErrors({})
        toast.info('Click on the map inside the selected zone to place the pole')
    }

    const cancelPoleAddition = () => {
        setIsAddingPole(false)
        setNewPole(null)
        setPoleFormData({
            code: '',
            router_ip: '',
            router_vpn_ip: '',
        })
        setPoleErrors({})
    }

    // Handle map click for pole placement
    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (!isAddingPole || !e.latLng || !activeZone) return

        const clicked = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        const zone = zones.find((z) => z.id === activeZone)

        if (!zone) {
            toast.error('Selected zone not found')
            return
        }

        const isInside = isPointInPolygon(clicked, zone.coordinates)

        if (!isInside) {
            toast.error('Pole must be placed inside the selected zone')
            return
        }

        setNewPole(clicked)
        setPoleErrors((prev) => ({ ...prev, location: '' }))
        toast.success('Pole position set! Fill in the details and save.')
    }, [isAddingPole, activeZone, zones])

    // Validate pole form
    const validatePoleForm = () => {
        const newErrors: Record<string, string> = {}
        if (!poleFormData.code.trim()) {
            newErrors.code = 'Pole code is required'
        }
        if (!activeZone) {
            newErrors.zone = 'Please select a zone first'
        }
        if (!newPole || !newPole.lat || !newPole.lng) {
            newErrors.location = 'Please click on the map to place the pole'
        }

        setPoleErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Submit pole
    const handlePoleSubmit = async () => {
        if (!validatePoleForm()) {
            toast.error('Please fix pole errors')
            return
        }

        try {
            setIsSubmitting(true)
            const formData = new FormData()
            formData.append('zone_id', String(activeZone))
            formData.append('code', poleFormData.code)
            formData.append('router_ip', poleFormData.router_ip)
            formData.append('router_vpn_ip', poleFormData.router_vpn_ip)
            formData.append('lat', String(newPole!.lat))
            formData.append('lng', String(newPole!.lng))

            const response = await createPole(token, formData)

            toast.success(response.message || 'Pole created successfully!')

            // Add pole to local state
            setPoles((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    code: poleFormData.code,
                    lat: newPole!.lat,
                    lng: newPole!.lng,
                },
            ])

            setNewPole(null)
            setIsAddingPole(false)
            setPoleFormData({
                code: '',
                router_ip: '',
                router_vpn_ip: '',
            })
            setPoleErrors({})
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create pole')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Delete zone
    const handleDeleteZone = async (zoneId: number) => {
        if (!window.confirm('Are you sure you want to delete this zone?')) return

        try {
            const response = await axios.delete(`${API_URL}/delete-zone/${zoneId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (response.data.success) {
                toast.success('Zone deleted successfully')
                setZones((prev) => prev.filter((zone) => zone.id !== zoneId))
                if (activeZone === zoneId) setActiveZone(null)
            } else {
                toast.error(response.data.message || 'Failed to delete zone')
            }
        } catch (error) {
            toast.error('Failed to delete zone')
        }
    }

    // Navigation handlers
    const goToNextStep = async () => {

        if (currentStep === 1) {
            if (validateStep1()) {
                setCurrentStep(2)
            } else {
                toast.error('Please fill in all required fields')
            }
        } else if (currentStep === 2) {
            // Create location and then move to next step
            await handleCreateLocation()
        } else if (currentStep === 3) {
            if (zones.length === 0) {
                toast.warning('You should create at least one zone before proceeding')
                return
            }
            setCurrentStep(4)
        } else if (currentStep === 4) {
            toast.success('Location setup completed!')
            navigate('/locations')
        }
    }

    const goToPreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const skipToFinish = () => {
        toast.info('Skipping to finish')
        navigate('/locations')
    }

    // Update polygon colors
    useEffect(() => {
        if (polygonRef.current && boundary.length > 0) {
            polygonRef.current.setOptions({
                fillColor: metronicColorToHex(formData.fill_color),
                strokeColor: metronicColorToHex(formData.border_color),
            })
        }
    }, [formData.fill_color, formData.border_color, boundary])

    useEffect(() => {
        if (zonePolygonRef.current) {
            zonePolygonRef.current.setOptions({
                fillColor: metronicColorToHex(zoneFormData.fill_color),
                strokeColor: metronicColorToHex(zoneFormData.border_color),
            })
        }
    }, [zoneFormData.fill_color, zoneFormData.border_color])

    if (loadError) return <div className='alert alert-danger'>Error loading map</div>
    if (!isLoaded)
        return (
            <div className='d-flex justify-content-center my-5'>
                <div className='spinner-border text-primary'></div>
            </div>
        )

    const center = boundary.length
        ? {
            lat: boundary.reduce((sum, p) => sum + p.lat, 0) / boundary.length,
            lng: boundary.reduce((sum, p) => sum + p.lng, 0) / boundary.length,
        }
        : defaultCenter

    return (
        <>
            <PageTitle breadcrumbs={[{ title: 'Locations', path: '/locations', isActive: false }]}>
                Create Location
            </PageTitle>
            {/* Wizard Stepper */}
            <div className='stepper stepper-pills stepper-column d-flex flex-column flex-xl-row flex-row-fluid gap-10' id='kt_create_location_stepper'>
                {/* Aside */}
                <div className='card d-flex justify-content-center justify-content-xl-start flex-row-auto w-100 w-xl-300px w-xxl-400px'>
                    <div className='card-body px-6 px-lg-10 px-xxl-15 py-20'>
                        <div className='stepper-nav'>
                            {/* Step 1 */}
                            <div className={`stepper-item ${currentStep === 1 ? 'current' : ''} ${currentStep > 1 ? 'completed' : ''}`} data-kt-stepper-element='nav'>
                                <div className='stepper-wrapper'>
                                    <div className='stepper-icon w-40px h-40px'>
                                        <i className='stepper-check fas fa-check'></i>
                                        <span className='stepper-number'>1</span>
                                    </div>
                                    <div className='stepper-label'>
                                        <h3 className='stepper-title'>Location Details</h3>
                                        <div className='stepper-desc fw-semibold'>Enter basic information</div>
                                    </div>
                                </div>
                                <div className='stepper-line h-40px'></div>
                            </div>

                            {/* Step 2 */}
                            <div className={`stepper-item ${currentStep === 2 ? 'current' : ''} ${currentStep > 2 ? 'completed' : ''}`} data-kt-stepper-element='nav'>
                                <div className='stepper-wrapper'>
                                    <div className='stepper-icon w-40px h-40px'>
                                        <i className='stepper-check fas fa-check'></i>
                                        <span className='stepper-number'>2</span>
                                    </div>
                                    <div className='stepper-label'>
                                        <h3 className='stepper-title'>Draw Location Boundary</h3>
                                        <div className='stepper-desc fw-semibold'>Define location area</div>
                                    </div>
                                </div>
                                <div className='stepper-line h-40px'></div>
                            </div>

                            {/* Step 3 */}
                            <div className={`stepper-item ${currentStep === 3 ? 'current' : ''} ${currentStep > 3 ? 'completed' : ''}`} data-kt-stepper-element='nav'>
                                <div className='stepper-wrapper'>
                                    <div className='stepper-icon w-40px h-40px'>
                                        <i className='stepper-check fas fa-check'></i>
                                        <span className='stepper-number'>3</span>
                                    </div>
                                    <div className='stepper-label'>
                                        <h3 className='stepper-title'>Create Zones</h3>
                                        <div className='stepper-desc fw-semibold'>Define zones within location</div>
                                    </div>
                                </div>
                                <div className='stepper-line h-40px'></div>
                            </div>

                            {/* Step 4 */}
                            <div className={`stepper-item ${currentStep === 4 ? 'current' : ''} ${currentStep > 4 ? 'completed' : ''}`} data-kt-stepper-element='nav'>
                                <div className='stepper-wrapper'>
                                    <div className='stepper-icon w-40px h-40px'>
                                        <i className='stepper-check fas fa-check'></i>
                                        <span className='stepper-number'>4</span>
                                    </div>
                                    <div className='stepper-label'>
                                        <h3 className='stepper-title'>Add Poles</h3>
                                        <div className='stepper-desc fw-semibold'>Place poles in zones</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className='card d-flex flex-row-fluid flex-center'>
                    <form className='card-body w-100 ' noValidate>
                        {/* Step 1: Location Details */}
                        {currentStep === 1 && (
                            <div className='current' data-kt-stepper-element='content'>
                                <div className='w-100'>
                                    <div className='pb-10 pb-lg-15'>
                                        <h2 className='fw-bold text-dark'>Location Details</h2>
                                        <div className='text-muted fw-semibold fs-6'>
                                            Enter the basic information for your location
                                        </div>
                                    </div>

                                    <FormInput
                                        label="Location Name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        error={errors.name}
                                        placeholder="Enter location name"
                                        required
                                        className="mb-10 fv-row"
                                    />

                                    <FormInput
                                        label="Description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Enter location description (optional)"
                                        isTextarea
                                        rows={3}
                                        className="mb-10 fv-row"
                                    />


                                    <div className='row mb-10'>

                                        <FormInput
                                            label="Camera Username"
                                            name="camera_user"
                                            type="text"
                                            value={formData.camera_user}
                                            onChange={handleChange}
                                            placeholder="Enter camera username"
                                            className="col-md-6 fv-row mb-5 mb-md-0"
                                        />

                                        <FormInput
                                            label="Camera Password"
                                            name="camera_pass"
                                            type="password"
                                            value={formData.camera_pass}
                                            onChange={handleChange}
                                            placeholder="Enter camera password"
                                            className="col-md-6 fv-row mb-5 mb-md-0"
                                        />
                                    </div>

                                    <div className='row'>
                                        <div className='col-md-6 fv-row mb-5 mb-md-0'>
                                            <ColorSelect
                                                label="Border Color"
                                                name="border_color"
                                                value={formData.border_color}
                                                onChange={handleChange}
                                            />
                                        </div>
                                        <div className='col-md-6 fv-row'>
                                            <ColorSelect
                                                label="Fill Color"
                                                name="fill_color"
                                                value={formData.fill_color}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Draw Boundary */}
                        {currentStep === 2 && (
                            <div className='current' data-kt-stepper-element='content'>
                                <div className='w-100'>
                                    <div className='pb-10 pb-lg-12'>
                                        <h2 className='fw-bold text-dark'>Draw Location Boundary</h2>
                                        <div className='text-muted fw-semibold fs-6'>
                                            Use the map tools to draw the boundary of your location
                                        </div>
                                    </div>

                                    <div className='d-flex justify-content-between align-items-center mb-5'>
                                        <h4 className='fs-6 fw-bold m-0'>Map Drawing Tools</h4>
                                        <div className='d-flex gap-2'>
                                            <button
                                                type='button'
                                                className='btn btn-sm btn-primary'
                                                onClick={startDrawingBoundary}
                                            >
                                                <i className='fas fa-draw-polygon me-1'></i> Draw Boundary
                                            </button>
                                            <button
                                                type='button'
                                                className='btn btn-sm btn-light-danger'
                                                onClick={clearBoundary}
                                                disabled={boundary.length === 0}
                                            >
                                                <i className='fas fa-trash me-1'></i> Clear
                                            </button>
                                        </div>
                                    </div>

                                    {errors.boundary && (
                                        <div className='alert alert-danger d-flex align-items-center p-4 mb-5'>
                                            <i className='fas fa-exclamation-circle me-3'></i>
                                            {errors.boundary}
                                        </div>
                                    )}

                                    {boundary.length > 0 && (
                                        <div className='alert alert-success d-flex align-items-center p-4 mb-5'>
                                            <i className='fas fa-check-circle me-3'></i>
                                            Boundary drawn successfully with {boundary.length} points
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
                                                    className='form-control bg-white'
                                                />
                                            </div>
                                        </StandaloneSearchBox>

                                        <GoogleMap
                                            onLoad={(map) => {
                                                mapRef.current = map
                                            }}
                                            onClick={handleMapClick}
                                            mapContainerStyle={mapContainerStyle}
                                            center={center}
                                            zoom={17}
                                            options={defaultMapOptions}
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
                                                        fillOpacity: 0.35,
                                                    }}
                                                />
                                            )}
                                        </GoogleMap>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Create Zones */}
                        {currentStep === 3 && (
                            <div className='current' data-kt-stepper-element='content'>
                                <div className='w-100'>
                                    <div className='pb-10 pb-lg-12'>
                                        <h2 className='fw-bold text-dark'>Create Zones</h2>
                                        <div className='text-muted fw-semibold fs-6'>
                                            Define zones within your location for better organization
                                        </div>
                                    </div>

                                    <div className='d-flex justify-content-between align-items-center mb-5'>
                                        <h4 className='fs-6 fw-bold m-0'>Zone Management</h4>
                                        <div className='d-flex gap-2'>
                                            <button
                                                type='button'
                                                className={`btn btn-sm ${isDrawingZone ? 'btn-success' : 'btn-light-success'}`}
                                                onClick={startDrawingZone}
                                            >
                                                <i className='fas fa-plus-circle me-1'></i> New Zone
                                            </button>
                                            {isDrawingZone && (
                                                <button
                                                    type='button'
                                                    className='btn btn-sm btn-light-danger'
                                                    onClick={clearZoneDrawing}
                                                >
                                                    <i className='fas fa-times-circle me-1'></i> Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Zone Form */}
                                    {showZoneForm && (
                                        <div className='card bg-light-primary mb-7'>
                                            <div className='card-body p-7'>
                                                <h5 className='fs-6 fw-bold mb-4'>New Zone Details</h5>

                                                <div className='row mb-5'>

                                                    <FormInput
                                                        label="Zone Name"
                                                        name="name"
                                                        value={zoneFormData.name}
                                                        onChange={handleZoneChange}
                                                        error={zoneErrors.name}
                                                        placeholder="Enter zone name"
                                                        required
                                                        className="col-md-4 mb-5 mb-md-0"
                                                    />
                                                    <div className='col-md-4 mb-5 mb-md-0'>
                                                        <ColorSelect
                                                            label="Border Color"
                                                            name="border_color"
                                                            value={zoneFormData.border_color}
                                                            onChange={handleZoneChange}
                                                        />
                                                    </div>
                                                    <div className='col-md-4'>
                                                        <ColorSelect
                                                            label="Fill Color"
                                                            name="fill_color"
                                                            value={zoneFormData.fill_color}
                                                            onChange={handleZoneChange}
                                                        />
                                                    </div>
                                                </div>

                                                <div className='d-flex justify-content-end gap-3'>
                                                    <button
                                                        type='button'
                                                        className='btn btn-light'
                                                        onClick={() => {
                                                            setShowZoneForm(false)
                                                            clearZoneDrawing()
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type='button'
                                                        className='btn btn-success'
                                                        onClick={handleZoneSubmit}
                                                        disabled={isSubmitting || isDrawingZone}
                                                    >
                                                        {isSubmitting ? (
                                                            <>
                                                                <span className='spinner-border spinner-border-sm me-2'></span>
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className='fas fa-save me-2'></i> Save Zone
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Zones List */}
                                    {zones.length > 0 && (
                                        <div className='card mb-7'>
                                            <div className='card-body p-0'>
                                                <div className='table-responsive'>
                                                    <table className='table table-row-dashed align-middle gs-0 gy-4 mb-0'>
                                                        <thead>
                                                            <tr className='fw-bold text-muted bg-light'>
                                                                <th className='ps-7'>Zone Name</th>
                                                                <th>Colors</th>
                                                                <th className='text-end pe-7'>Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {zones.map((zone) => (
                                                                <tr key={zone.id}>
                                                                    <td className='ps-7'>
                                                                        <span className='fw-bold'>{zone.name}</span>
                                                                    </td>
                                                                    <td>
                                                                        <div className='d-flex gap-2'>
                                                                            <div
                                                                                style={{
                                                                                    width: 24,
                                                                                    height: 24,
                                                                                    backgroundColor: metronicColorToHex(zone.border_color),
                                                                                    border: '1px solid #E4E6EF',
                                                                                    borderRadius: 4,
                                                                                }}
                                                                            ></div>
                                                                            <div
                                                                                style={{
                                                                                    width: 24,
                                                                                    height: 24,
                                                                                    backgroundColor: metronicColorToHex(zone.fill_color),
                                                                                    border: '1px solid #E4E6EF',
                                                                                    borderRadius: 4,
                                                                                }}
                                                                            ></div>
                                                                        </div>
                                                                    </td>
                                                                    <td className='text-end pe-7'>
                                                                        <button
                                                                            type='button'
                                                                            className='btn btn-icon btn-bg-light btn-active-color-danger btn-sm'
                                                                            onClick={() => handleDeleteZone(zone.id)}
                                                                        >
                                                                            <i className='fas fa-trash'></i>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {zones.length === 0 && !showZoneForm && (
                                        <div className='notice d-flex bg-light-warning rounded border-warning border border-dashed p-6 mb-6'>
                                            <i className='fas fa-exclamation-triangle text-warning me-4 fs-2'></i>
                                            <div className='d-flex flex-stack flex-grow-1'>
                                                <div className='fw-semibold'>
                                                    <div className='fs-6 text-gray-700'>
                                                        No zones created yet. Click "New Zone" to create your first zone.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Map */}
                                    <div className='position-relative'>
                                        <GoogleMap
                                            onLoad={(map) => {
                                                mapRef.current = map
                                            }}
                                            onClick={handleMapClick}
                                            mapContainerStyle={mapContainerStyle}
                                            center={center}
                                            zoom={17}
                                            options={defaultMapOptions}
                                        >
                                            <DrawingManager
                                                onLoad={(dm) => {
                                                    drawingManagerRef.current = dm
                                                    dm.setDrawingMode(null)
                                                }}
                                                onPolygonComplete={handleZonePolygonComplete}
                                                options={{
                                                    drawingControl: false,
                                                    polygonOptions: {
                                                        fillColor: metronicColorToHex(zoneFormData.fill_color),
                                                        fillOpacity: 0.5,
                                                        strokeColor: metronicColorToHex(zoneFormData.border_color),
                                                        strokeWeight: 2,
                                                        editable: true,
                                                        draggable: true,
                                                    },
                                                }}
                                            />

                                            {/* Location boundary */}
                                            <Polygon
                                                paths={boundary}
                                                options={{
                                                    fillColor: metronicColorToHex(formData.fill_color),
                                                    strokeColor: metronicColorToHex(formData.border_color),
                                                    strokeWeight: 2,
                                                    fillOpacity: 0.2,
                                                }}
                                            />

                                            {/* Zones */}
                                            {zones.map((zone) => (
                                                <Polygon
                                                    key={zone.id}
                                                    paths={zone.coordinates}
                                                    options={{
                                                        fillColor: metronicColorToHex(zone.fill_color),
                                                        strokeColor: metronicColorToHex(zone.border_color),
                                                        strokeWeight: 2,
                                                        fillOpacity: 0.4,
                                                    }}
                                                />
                                            ))}
                                        </GoogleMap>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Add Poles */}
                        {currentStep === 4 && (
                            <div className='current' data-kt-stepper-element='content'>
                                <div className='w-100'>
                                    <div className='pb-10 pb-lg-12'>
                                        <h2 className='fw-bold text-dark'>Add Poles</h2>
                                        <div className='text-muted fw-semibold fs-6'>
                                            Place poles within your zones for monitoring
                                        </div>
                                    </div>

                                    <div className='d-flex justify-content-between align-items-center mb-5'>
                                        <h4 className='fs-6 fw-bold m-0'>Pole Management</h4>
                                        <button
                                            type='button'
                                            className={`btn btn-sm ${isAddingPole ? 'btn-info' : 'btn-light-info'}`}
                                            onClick={startAddingPole}
                                            disabled={!activeZone}
                                        >
                                            <i className='fas fa-map-marker-alt me-1'></i> Add Pole
                                        </button>
                                    </div>

                                    {!activeZone && (
                                        <div className='notice d-flex bg-light-info rounded border-info border border-dashed p-6 mb-7'>
                                            <i className='fas fa-info-circle text-info me-4 fs-2'></i>
                                            <div className='d-flex flex-stack flex-grow-1'>
                                                <div className='fw-semibold'>
                                                    <div className='fs-6 text-gray-700'>
                                                        Please select a zone by clicking on it before adding poles.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Pole Form */}
                                    {isAddingPole && (
                                        <div className='card mb-7'>
                                            <div className='card-body p-7'>
                                                <h5 className='fs-6 fw-bold mb-4'>
                                                    <i className='fas fa-map-marker-alt me-2'></i>
                                                    New Pole Details
                                                </h5>

                                                <div className='row mb-5'>
                                                    <FormInput
                                                        label="Pole Code"
                                                        name="code"
                                                        value={poleFormData.code}
                                                        onChange={handlePoleChange}
                                                        error={poleErrors.code}
                                                        placeholder="Enter pole code"
                                                        required
                                                        className="col-md-4 mb-5 mb-md-0"
                                                    />
                                                    <FormInput
                                                        label="Router IP"
                                                        name="router_ip"
                                                        type="text"
                                                        value={poleFormData.router_ip}
                                                        onChange={handlePoleChange}
                                                        error={poleErrors.router_ip}
                                                        placeholder="Enter router IP"
                                                        required
                                                        className="col-md-4 mb-5 mb-md-0"
                                                    />
                                                    <FormInput
                                                        label="Router VPN IP"
                                                        name="router_vpn_ip"
                                                        type="text"
                                                        value={poleFormData.router_vpn_ip}
                                                        onChange={handlePoleChange}
                                                        error={poleErrors.router_vpn_ip}
                                                        placeholder="Enter VPN IP"
                                                        required
                                                        className="col-md-4"
                                                    />
                                                </div>

                                                {newPole && (
                                                    <div className='notice d-flex bg-light-success rounded border-success border border-dashed p-4 mb-5'>
                                                        <i className='fas fa-check-circle text-success me-3'></i>
                                                        <div className='fw-semibold'>
                                                            Pole position set at: Lat {newPole.lat.toFixed(6)}, Lng {newPole.lng.toFixed(6)}
                                                        </div>
                                                    </div>
                                                )}

                                                {poleErrors.location && (
                                                    <div className='notice d-flex bg-light-danger rounded border-danger border border-dashed p-4 mb-5'>
                                                        <i className='fas fa-exclamation-circle text-danger me-3'></i>
                                                        <div className='fw-semibold'>{poleErrors.location}</div>
                                                    </div>
                                                )}

                                                <div className='d-flex justify-content-end gap-3'>
                                                    <button
                                                        type='button'
                                                        className='btn btn-light'
                                                        onClick={cancelPoleAddition}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type='button'
                                                        className='btn btn-info'
                                                        onClick={handlePoleSubmit}
                                                        disabled={isSubmitting}
                                                    >
                                                        {isSubmitting ? (
                                                            <>
                                                                <span className='spinner-border spinner-border-sm me-2'></span>
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className='fas fa-save me-2'></i> Save Pole
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Poles List */}
                                    {poles.length > 0 && (
                                        <div className='card mb-7'>
                                            <div className='card-body p-0'>
                                                <div className='table-responsive'>
                                                    <table className='table table-row-dashed align-middle gs-0 gy-4 mb-0'>
                                                        <thead>
                                                            <tr className='fw-bold text-muted bg-light'>
                                                                <th className='ps-7'>Pole Code</th>
                                                                <th>Location</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {poles.map((pole) => (
                                                                <tr key={pole.id}>
                                                                    <td className='ps-7'>
                                                                        <span className='fw-bold'>{pole.code}</span>
                                                                    </td>
                                                                    <td>
                                                                        <span className='text-muted'>
                                                                            {pole.lat.toFixed(6)}, {pole.lng.toFixed(6)}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Map */}
                                    <div className='position-relative'>
                                        <GoogleMap
                                            onLoad={(map) => {
                                                mapRef.current = map
                                            }}
                                            onClick={handleMapClick}
                                            mapContainerStyle={mapContainerStyle}
                                            center={center}
                                            zoom={17}
                                            options={defaultMapOptions}
                                        >
                                            {/* Location boundary */}
                                            <Polygon
                                                paths={boundary}
                                                options={{
                                                    fillColor: metronicColorToHex(formData.fill_color),
                                                    strokeColor: metronicColorToHex(formData.border_color),
                                                    strokeWeight: 2,
                                                    fillOpacity: 0.2,
                                                }}
                                            />

                                            {/* Zones */}
                                            {zones.map((zone) => (
                                                <Polygon
                                                    key={zone.id}
                                                    paths={zone.coordinates}
                                                    options={{
                                                        fillColor: metronicColorToHex(zone.fill_color),
                                                        strokeColor: metronicColorToHex(zone.border_color),
                                                        strokeWeight: activeZone === zone.id ? 3 : 2,
                                                        fillOpacity: activeZone === zone.id ? 0.5 : 0.35,
                                                        zIndex: activeZone === zone.id ? 2 : 1,
                                                        clickable: true,
                                                    }}
                                                    onClick={(e) => {
                                                        if (isAddingPole) {
                                                            handleMapClick(e)
                                                        } else {
                                                            setActiveZone(zone.id)
                                                            toast.info(`Zone "${zone.name}" selected`)
                                                        }
                                                    }}
                                                />
                                            ))}

                                            {/* Existing poles */}
                                            {poles.map((pole) => (
                                                <Marker
                                                    key={pole.id}
                                                    position={{ lat: Number(pole.lat), lng: Number(pole.lng) }}
                                                    title={`Pole: ${pole.code}`}
                                                    icon={{
                                                        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                                                        scaledSize: new google.maps.Size(32, 32),
                                                    }}
                                                />
                                            ))}

                                            {/* New pole being placed */}
                                            {newPole && (
                                                <Marker
                                                    position={newPole}
                                                    title='New Pole Location'
                                                    icon={{
                                                        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                                                        scaledSize: new google.maps.Size(40, 40),
                                                    }}
                                                />
                                            )}
                                        </GoogleMap>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className='d-flex flex-stack pt-15'>
                            <div className='mr-2'>
                                {currentStep > 1 && currentStep < 3 && (
                                    <button
                                        type='button'
                                        className='btn btn-lg btn-light-primary me-3'
                                        onClick={goToPreviousStep}
                                    >
                                        <i className='fas fa-arrow-left me-2'></i>
                                        Previous
                                    </button>
                                )}
                            </div>

                            <div>
                                {currentStep >= 3 && (
                                    <button
                                        type='button'
                                        className='btn btn-lg btn-light me-3'
                                        onClick={skipToFinish}
                                    >
                                        Skip & Finish
                                    </button>
                                )}

                                <button
                                    type='button'
                                    className='btn btn-lg btn-primary'
                                    onClick={goToNextStep}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className='spinner-border spinner-border-sm me-2'></span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            {currentStep === 4 ? 'Finish' : 'Continue'}
                                            <i className='fas fa-arrow-right ms-2'></i>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}

export { CreateLocationWizard }