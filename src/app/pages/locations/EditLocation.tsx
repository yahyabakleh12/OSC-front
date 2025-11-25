import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { KTIcon } from '../../../_metronic/helpers'
import { metronicColorToHex, colorOptions } from '../../utils/colorUtils'
import { isPointInPolygon, isPolygonInside } from '../../utils/polygonUtils'
import { defaultMapOptions, mapContainerStyle } from '../../utils/mapConstants'
import { ColorSelect } from '../../components/common/ColorSelect'
import { FormInput } from '../../components/common/FormInput'
import { toast } from 'react-toastify'
import { PageTitle } from '../../../_metronic/layout/core'
import { useGoogleMaps } from '../../../hooks/useGoogleMaps'
import { GoogleMap, Polygon, DrawingManager, StandaloneSearchBox, Marker } from '@react-google-maps/api'
import { getLocations } from '../../modules/auth/core/_requests'

const API_URL = import.meta.env.VITE_APP_API_URL




const EditLocation: React.FC = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const token = localStorage.getItem('token') || ''

    const { isLoaded, loadError } = useGoogleMaps()

    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Location data
    const [formData, setFormData] = useState<any>({
        name: '',
        description: '',
        camera_user: '',
        camera_pass: '',
        border_color: 'bg-primary',
        fill_color: 'bg-warning',
        boundary: [],
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Zones
    const [zones, setZones] = useState<any[]>([])
    const [activeZone, setActiveZone] = useState<number | null>(null)
    const [zoneFormData, setZoneFormData] = useState({
        name: '',
        border_color: 'bg-success',
        fill_color: 'bg-success',
    })
    const [zoneErrors, setZoneErrors] = useState<Record<string, string>>({})
    const [isDrawingZone, setIsDrawingZone] = useState(false)
    const [isEditingZone, setIsEditingZone] = useState<number | null>(null)
    const [showZoneForm, setShowZoneForm] = useState(false)
    const [newZoneCoordinates, setNewZoneCoordinates] = useState<{ lat: number; lng: number }[]>([])

    // Poles
    const [poles, setPoles] = useState<any[]>([])
    const [isAddingPole, setIsAddingPole] = useState(false)
    const [isEditingPole, setIsEditingPole] = useState<number | null>(null)
    const [newPole, setNewPole] = useState<{ lat: number; lng: number } | null>(null)
    const [poleFormData, setPoleFormData] = useState({
        code: '',
        router_ip: '',
        router_vpn_ip: '',
    })
    const [poleErrors, setPoleErrors] = useState<Record<string, string>>({})

    // Cameras
    const [cameras, setCameras] = useState<any[]>([])
    const [isAddingCamera, setIsAddingCamera] = useState(false)
    const [isEditingCamera, setIsEditingCamera] = useState<number | null>(null)
    const [selectedPoleForCamera, setSelectedPoleForCamera] = useState<number | null>(null)
    const [cameraFormData, setCameraFormData] = useState({
        camera_ip: '',
        number_of_parking: '',
    })
    const [cameraErrors, setCameraErrors] = useState<Record<string, string>>({})

    // Map refs
    const mapRef = useRef<google.maps.Map | null>(null)
    const polygonRef = useRef<google.maps.Polygon | null>(null)
    const zonePolygonRef = useRef<google.maps.Polygon | null>(null)
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)
    const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null)

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [locRes, zonesRes, polesRes, camerasRes] = await Promise.all([
                    getLocations(token),
                    axios.get(`${API_URL}/zones`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_URL}/poles`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_URL}/cameras`, { headers: { Authorization: `Bearer ${token}` } }),
                ])

                const loc = locRes.data.data.find((location: any) => location.id === Number(id))
                if (!loc) {
                    toast.error('Location not found')
                    navigate('/locations')
                    return
                }

                const parsedBoundary = typeof loc.boundary === 'string' ? JSON.parse(loc.boundary) : loc.boundary || []

                setFormData({
                    name: loc.name || '',
                    description: loc.description || '',
                    camera_user: loc.camera_user || '',
                    camera_pass: loc.camera_pass || '',
                    border_color: loc.border_color || 'bg-primary',
                    fill_color: loc.fill_color || 'bg-warning',
                    boundary: parsedBoundary,
                })

                // Filter zones for this location
                const locationZones = Array.isArray(zonesRes.data.data)
                    ? zonesRes.data.data
                        .filter((z: any) => z.location_id === Number(id))
                        .map((zone: any) => ({
                            ...zone,
                            coordinates: typeof zone.coordinates === 'string' ? JSON.parse(zone.coordinates) : zone.coordinates,
                        }))
                    : []
                setZones(locationZones)

                // Filter poles for zones in this location
               const zoneIds = locationZones.map((z: any) => z.id)
                const locationPoles = Array.isArray(polesRes.data.data)
                    ? polesRes.data.data.filter((p: any) => zoneIds.includes(p.zone_id))
                    : []
                setPoles(locationPoles)

                // Filter cameras for poles in this location
                const poleIds = locationPoles.map((p: any) => p.id)
                const locationCameras = Array.isArray(camerasRes.data.data)
                    ? camerasRes.data.data.filter((c: any) => poleIds.includes(c.pole_id))
                    : []
                setCameras(locationCameras)
            } catch (err) {
                toast.error('Failed to load location details')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id, token, navigate])

    // Form handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev: any) => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    }

    const handleZoneChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target
        setZoneFormData((prev) => ({ ...prev, [name]: value }))
        if (zoneErrors[name]) setZoneErrors((prev) => ({ ...prev, [name]: '' }))
    }


    const handlePoleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target
        setPoleFormData((prev) => ({ ...prev, [name]: value }))
        if (poleErrors[name]) setPoleErrors((prev) => ({ ...prev, [name]: '' }))
    }


    const handleCameraChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target
        setCameraFormData((prev) => ({ ...prev, [name]: value }))
        if (cameraErrors[name]) setCameraErrors((prev) => ({ ...prev, [name]: '' }))
    }


    // Validation
    const validateForm = () => {
        const newErrors: Record<string, string> = {}
        if (!formData.name.trim()) newErrors.name = 'Name is required'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
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

        if (!isPolygonInside(coordinates, formData.boundary)) {
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
            if (!isPolygonInside(updatedCoords, formData.boundary)) {
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
    const startDrawingZone = () => {
        if (drawingManagerRef.current) {
            if (zonePolygonRef.current) zonePolygonRef.current.setMap(null)
            zonePolygonRef.current = null
            setIsDrawingZone(true)
            setIsEditingZone(null)
            setActiveZone(null)
            setShowZoneForm(false)
            setZoneFormData({ name: '', border_color: 'bg-success', fill_color: 'bg-success' })
            drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON)
            toast.info('Zone drawing mode activated')
        }
    }

    const clearZoneDrawing = () => {
        if (zonePolygonRef.current) zonePolygonRef.current.setMap(null)
        zonePolygonRef.current = null
        setIsDrawingZone(false)
        setShowZoneForm(false)
        setNewZoneCoordinates([])
        drawingManagerRef.current?.setDrawingMode(null)
    }

    // Handle search
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

    // Submit location
    const handleSubmit = async () => {
        if (!validateForm()) {
            toast.error('Please fix the errors before saving')
            return
        }

        try {
            setIsSubmitting(true)
            const form = new FormData()
            form.append('name', formData.name)
            form.append('description', formData.description)
            form.append('camera_user', formData.camera_user)
            form.append('camera_pass', formData.camera_pass)
            form.append('border_color', formData.border_color)
            form.append('fill_color', formData.fill_color)
            form.append('boundary', JSON.stringify(formData.boundary))

            await axios.put(`${API_URL}/update-location/${id}`, form, {
                headers: { Authorization: `Bearer ${token}` },
            })

            toast.success('Location updated successfully!')
            navigate('/locations')
        } catch (err) {
            toast.error('Failed to update location')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Zone CRUD
    const handleZoneSubmit = async () => {
        const newErrors: Record<string, string> = {}
        if (!zoneFormData.name.trim()) newErrors.name = 'Zone name is required'
        if (isEditingZone === null && newZoneCoordinates.length < 3) {
            newErrors.coordinates = 'Please draw a valid zone'
        }
        setZoneErrors(newErrors)
        if (Object.keys(newErrors).length > 0) return

        try {
            setIsSubmitting(true)
            const zoneData = new FormData()
            zoneData.append('location_id', id || '')
            zoneData.append('name', zoneFormData.name)
            zoneData.append('border_color', zoneFormData.border_color)
            zoneData.append('fill_color', zoneFormData.fill_color)

            let coordinates = isEditingZone !== null
                ? zones.find((z) => z.id === isEditingZone)?.coordinates
                : newZoneCoordinates

            zoneData.append('coordinates', JSON.stringify(coordinates))

            let response
            if (isEditingZone !== null) {
                response = await axios.put(`${API_URL}/update-zone/${isEditingZone}`, zoneData, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            } else {
                response = await axios.post(`${API_URL}/create-zone`, zoneData, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            }

            if (response.data && response.data.data) {
                toast.success(`Zone ${isEditingZone !== null ? 'updated' : 'created'} successfully!`)

                // Refresh zones
                const zonesRes = await axios.get(`${API_URL}/zones`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                const locationZones = Array.isArray(zonesRes.data.data)
                    ? zonesRes.data.data
                        .filter((z: any) => z.location_id === Number(id))
                        .map((zone: any) => ({
                            ...zone,
                            coordinates: typeof zone.coordinates === 'string' ? JSON.parse(zone.coordinates) : zone.coordinates,
                        }))
                    : []
                setZones(locationZones)

                // Reset form
                setZoneFormData({ name: '', border_color: 'bg-success', fill_color: 'bg-success' })
                if (zonePolygonRef.current) zonePolygonRef.current.setMap(null)
                zonePolygonRef.current = null
                setIsEditingZone(null)
                setActiveZone(null)
                setShowZoneForm(false)
                setNewZoneCoordinates([])
            }
        } catch (err) {
            toast.error('Failed to save zone')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEditZone = (zoneId: number) => {
        const zone = zones.find((z) => z.id === zoneId)
        if (!zone) return

        setZoneFormData({
            name: zone.name,
            border_color: zone.border_color || 'bg-success',
            fill_color: zone.fill_color || 'bg-success',
        })

        setIsEditingZone(zoneId)
        setActiveZone(zoneId)
        setShowZoneForm(true)
    }

    const handleDeleteZone = async (zoneId: number) => {
        if (!window.confirm('Are you sure you want to delete this zone?')) return

        try {
            await axios.delete(`${API_URL}/delete-zone/${zoneId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            toast.success('Zone deleted successfully')
            setZones((prev) => prev.filter((zone) => zone.id !== zoneId))
            if (activeZone === zoneId) setActiveZone(null)
            if (isEditingZone === zoneId) setIsEditingZone(null)
            setShowZoneForm(false)
        } catch (error) {
            toast.error('Failed to delete zone')
        }
    }

    // Pole CRUD
    const startAddingPole = () => {
        if (!activeZone) {
            toast.error('Please select a zone first')
            return
        }
        setIsAddingPole(true)
        setIsEditingPole(null)
        setNewPole(null)
        setPoleFormData({ code: '', router_ip: '', router_vpn_ip: '' })
        setPoleErrors({})
        toast.info('Click on the map inside the selected zone to place the pole')
    }

    const startEditingPole = (pole: any) => {
        setIsEditingPole(pole.id)
        setIsAddingPole(false)
        setPoleFormData({
            code: pole.code,
            router_ip: pole.router_ip || '',
            router_vpn_ip: pole.router_vpn_ip || '',
        })
        setNewPole({ lat: Number(pole.lat), lng: Number(pole.lng) })
        setActiveZone(pole.zone_id)
        setPoleErrors({})
    }

    const handleMapClick = useCallback(
        (e: google.maps.MapMouseEvent) => {
            if (!isAddingPole && !isEditingPole) return
            if (!e.latLng || !activeZone) return

            const clicked = { lat: e.latLng.lat(), lng: e.latLng.lng() }
            const zone = zones.find((z) => z.id === activeZone)

            if (!zone) {
                toast.error('Selected zone not found')
                return
            }

            if (!isPointInPolygon(clicked, zone.coordinates)) {
                toast.error('Pole must be placed inside the selected zone')
                return
            }

            setNewPole(clicked)
            setPoleErrors((prev) => ({ ...prev, location: '' }))
            toast.success('Pole position set!')
        },
        [isAddingPole, isEditingPole, activeZone, zones]
    )

    const handlePoleSubmit = async () => {
        const newErrors: Record<string, string> = {}
        if (!poleFormData.code.trim()) newErrors.code = 'Pole code is required'
        if (!activeZone) newErrors.zone = 'Please select a zone first'
        if (!newPole) newErrors.location = 'Please click on the map to place the pole'

        setPoleErrors(newErrors)
        if (Object.keys(newErrors).length > 0) return

        try {
            setIsSubmitting(true)
            const formData = new FormData()
            formData.append('zone_id', String(activeZone))
            formData.append('code', poleFormData.code)
            formData.append('router_ip', poleFormData.router_ip)
            formData.append('router_vpn_ip', poleFormData.router_vpn_ip)
            formData.append('lat', String(newPole!.lat))
            formData.append('lng', String(newPole!.lng))

            if (isEditingPole) {
                await axios.put(`${API_URL}/update-pole/${isEditingPole}`, formData, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                toast.success('Pole updated successfully!')
            } else {
                await axios.post(`${API_URL}/create-pole`, formData, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                toast.success('Pole created successfully!')
            }

            // Refresh poles
            const polesRes = await axios.get(`${API_URL}/poles`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const zoneIds = zones.map((z) => z.id)
            const locationPoles = Array.isArray(polesRes.data.data)
                ? polesRes.data.data.filter((p: any) => zoneIds.includes(p.zone_id))
                : []
            setPoles(locationPoles)

            // Reset
            setNewPole(null)
            setIsAddingPole(false)
            setIsEditingPole(null)
            setPoleFormData({ code: '', router_ip: '', router_vpn_ip: '' })
            setPoleErrors({})
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save pole')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeletePole = async (poleId: number) => {
        if (!window.confirm('Are you sure you want to delete this pole?')) return

        try {
            await axios.delete(`${API_URL}/delete-pole/${poleId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            toast.success('Pole deleted successfully')
            setPoles((prev) => prev.filter((p) => p.id !== poleId))
        } catch (error) {
            toast.error('Failed to delete pole')
        }
    }

    const cancelPoleAction = () => {
        setIsAddingPole(false)
        setIsEditingPole(null)
        setNewPole(null)
        setPoleFormData({ code: '', router_ip: '', router_vpn_ip: '' })
        setPoleErrors({})
    }

    // Camera CRUD
    const startAddingCamera = (poleId: number) => {
        setIsAddingCamera(true)
        setIsEditingCamera(null)
        setSelectedPoleForCamera(poleId)
        setCameraFormData({ camera_ip: '', number_of_parking: '' })
        setCameraErrors({})
    }

    const startEditingCamera = (camera: any) => {
        setIsEditingCamera(camera.id)
        setIsAddingCamera(false)
        setSelectedPoleForCamera(camera.pole_id)
        setCameraFormData({
            camera_ip: camera.camera_ip || '',
            number_of_parking: String(camera.number_of_parking || ''),
        })
        setCameraErrors({})
    }

    const handleCameraSubmit = async () => {
        const newErrors: Record<string, string> = {}
        if (!cameraFormData.camera_ip.trim()) newErrors.camera_ip = 'Camera IP is required'
        if (!cameraFormData.number_of_parking.trim()) newErrors.number_of_parking = 'Number of parking is required'
        if (!selectedPoleForCamera) newErrors.pole = 'Please select a pole'

        setCameraErrors(newErrors)
        if (Object.keys(newErrors).length > 0) return

        try {
            setIsSubmitting(true)
            const formData = new FormData()
            formData.append('pole_id', String(selectedPoleForCamera))
            formData.append('camera_ip', cameraFormData.camera_ip)
            formData.append('number_of_parking', cameraFormData.number_of_parking)

            // Add pole_code for create operation
            if (!isEditingCamera) {
                const pole = poles.find((p) => p.id === selectedPoleForCamera)
                if (pole) {
                    formData.append('pole_code', pole.code)
                }
            }

            if (isEditingCamera) {
                await axios.put(`${API_URL}/update-camera/${isEditingCamera}`, formData, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                toast.success('Camera updated successfully!')
            } else {
                await axios.post(`${API_URL}/create-camera`, formData, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                toast.success('Camera created successfully!')
            }

            // Refresh cameras
            const camerasRes = await axios.get(`${API_URL}/cameras`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const poleIds = poles.map((p) => p.id)
            const locationCameras = Array.isArray(camerasRes.data.data)
                ? camerasRes.data.data.filter((c: any) => poleIds.includes(c.pole_id))
                : []
            setCameras(locationCameras)

            // Reset
            setIsAddingCamera(false)
            setIsEditingCamera(null)
            setSelectedPoleForCamera(null)
            setCameraFormData({ camera_ip: '', number_of_parking: '' })
            setCameraErrors({})
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save camera')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteCamera = async (cameraId: number) => {
        if (!window.confirm('Are you sure you want to delete this camera?')) return

        try {
            await axios.delete(`${API_URL}/delete-camera/${cameraId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            toast.success('Camera deleted successfully')
            setCameras((prev) => prev.filter((c) => c.id !== cameraId))
        } catch (error) {
            toast.error('Failed to delete camera')
        }
    }

    const cancelCameraAction = () => {
        setIsAddingCamera(false)
        setIsEditingCamera(null)
        setSelectedPoleForCamera(null)
        setCameraFormData({ camera_ip: '', number_of_parking: '' })
        setCameraErrors({})
    }

    // Update polygon colors
    useEffect(() => {
        if (polygonRef.current && formData.boundary.length > 0) {
            polygonRef.current.setOptions({
                fillColor: metronicColorToHex(formData.fill_color),
                strokeColor: metronicColorToHex(formData.border_color),
            })
        }
    }, [formData.fill_color, formData.border_color])
    useEffect(() => {
        if (zonePolygonRef.current) {
            zonePolygonRef.current.setOptions({
                fillColor: metronicColorToHex(zoneFormData.fill_color),
                strokeColor: metronicColorToHex(zoneFormData.border_color),
            })
        }
    }, [zoneFormData.fill_color, zoneFormData.border_color])
    useEffect(() => {
        if (isEditingZone !== null) {
            setZones((prevZones) =>
                prevZones.map((zone) =>
                    zone.id === isEditingZone
                        ? {
                            ...zone,
                            border_color: zoneFormData.border_color,
                            fill_color: zoneFormData.fill_color,
                        }
                        : zone
                )
            )
        }
    }, [zoneFormData.fill_color, zoneFormData.border_color, isEditingZone])





    if (loadError) return <div className='alert alert-danger'>Error loading map</div>
    if (loading || !isLoaded)
        return (
            <div className='d-flex justify-content-center my-5'>
                <div className='spinner-border text-primary'></div>
            </div>
        )

    const center = formData.boundary.length
        ? {
            lat: formData.boundary.reduce((sum: number, p: any) => sum + p.lat, 0) / formData.boundary.length,
            lng: formData.boundary.reduce((sum: number, p: any) => sum + p.lng, 0) / formData.boundary.length,
        }
        : { lat: 25.1972, lng: 55.2744 }

    return (
        <>
            <PageTitle breadcrumbs={[{ title: 'Locations', path: '/locations', isActive: false }]}>
                Edit Location
            </PageTitle>

            <div className='card shadow-sm'>
                <div className='card-header border-0 pt-6'>
                    <div className='card-title'>
                        <h3 className='fw-bolder m-0'>Edit Location</h3>
                    </div>
                </div>

                <div className='card-body py-5'>
                    {/* Location Details Form */}
                    <div className='mb-10'>
                        <h4 className='fs-4 fw-bold mb-5'>Location Details</h4>

                        <FormInput
                            label='Location Name'
                            name='name'
                            value={formData.name}
                            onChange={handleChange}
                            placeholder='Enter location name'
                            error={errors.name}
                            className="mb-10 fv-row"
                        />
                        <FormInput
                            label='Description'
                            name='description'
                            isTextarea
                            value={formData.description}
                            onChange={handleChange}
                            placeholder='Enter optional description'
                            className="mb-10 fv-row"
                        />


                        <h4 className='fs-4 fw-bold mb-5'>Camera Credentials</h4>
                        <div className='row mb-7'>

                            <FormInput
                                label='Camera Username'
                                name='camera_user'
                                value={formData.camera_user}
                                onChange={handleChange}
                                placeholder='Enter camera username'
                                className="col-md-6 mb-5 mb-md-0"
                            />

                            <FormInput
                                label='Camera Password'
                                name='camera_pass'
                                type='password'
                                value={formData.camera_pass}
                                onChange={handleChange}
                                placeholder='Enter camera password'
                                className="col-md-6 mb-5 mb-md-0"
                            />
                        </div>

                        <h4 className='fs-4 fw-bold mb-5'>Boundary Appearance</h4>
                        <div className='row'>
                            <div className='col-md-6 mb-5 mb-md-0'>
                                <ColorSelect
                                    label="Border Color"
                                    name="border_color"
                                    value={formData.border_color}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className='col-md-6'>
                                <ColorSelect
                                    label="Fill Color"
                                    name="fill_color"
                                    value={formData.fill_color}
                                    onChange={handleChange}
                                />

                            </div>
                        </div>
                    </div>



                    <div className='mb-10'>
                        <div className='d-flex justify-content-between align-items-center mb-5'>
                            <h4 className='fs-4 fw-bold m-0'>Location Map</h4>
                        </div>

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
                                    <span className='input-group-text bg-white border-end-0'>
                                        <i className='fas fa-search text-muted'></i>
                                    </span>
                                    <input type='text' placeholder='Search for a location...' className='form-control bg-white border-start-0' />
                                </div>
                            </StandaloneSearchBox>

                            <div className='rounded overflow-hidden'>
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

                                    {/* Main location boundary */}
                                    {formData.boundary.length > 0 && (
                                        <Polygon
                                            paths={formData.boundary}
                                            options={{
                                                fillColor: metronicColorToHex(formData.fill_color),
                                                strokeColor: metronicColorToHex(formData.border_color),
                                                strokeWeight: 2,
                                                fillOpacity: 0.35,
                                            }}
                                        />
                                    )}

                                    {/* Render zones */}
                                    {zones.map((zone) => (
                                        <Polygon
                                            key={zone.id}
                                            paths={zone.coordinates}
                                            options={{
                                                fillColor: metronicColorToHex(zone.fill_color || 'bg-success'),
                                                strokeColor: metronicColorToHex(zone.border_color || 'bg-success'),
                                                strokeWeight: activeZone === zone.id ? 3 : 2,
                                                fillOpacity: activeZone === zone.id ? 0.5 : 0.35,
                                                zIndex: activeZone === zone.id ? 2 : 1,
                                                clickable: true,
                                            }}
                                            onClick={(e) => {
                                                if (isAddingPole || isEditingPole) {
                                                    handleMapClick(e)
                                                } else {
                                                    setActiveZone(zone.id)
                                                    toast.info(`Zone "${zone.name}" selected`)
                                                }
                                            }}
                                        />
                                    ))}

                                    {/* Render existing poles */}
                                    {poles.map((pole) => (
                                        <Marker
                                            key={pole.id}
                                            position={{ lat: Number(pole.lat), lng: Number(pole.lng) }}
                                            title={`Pole: ${pole.code}`}
                                            icon={{
                                                url: isEditingPole === pole.id
                                                    ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                                                    : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                                                scaledSize: new google.maps.Size(32, 32),
                                            }}
                                        />
                                    ))}

                                    {/* Render new pole being placed */}
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

                    {/* Zones Section */}


                    <div className='mb-10'>
                        <div className='d-flex justify-content-between align-items-center mb-5'>
                            <h4 className='fs-4 fw-bold m-0'>Manage Zones</h4>
                            <div className='d-flex gap-2'>
                                <button
                                    type='button'
                                    className={`btn ${isDrawingZone ? 'btn-success' : 'btn-light-success'}`}
                                    onClick={startDrawingZone}
                                    disabled={!formData.boundary.length}
                                >
                                    <KTIcon iconName='plus' className='fs-1' /> New Zone
                                </button>
                                <button
                                    type='button'
                                    className={`btn ${isAddingPole ? 'btn-info' : 'btn-light-info'}`}
                                    onClick={startAddingPole}
                                    disabled={!activeZone}
                                >
                                    <KTIcon iconName='flag' className='fs-1' /> Add Pole
                                </button>
                                <button
                                    type='button'
                                    className='btn btn-light-danger'
                                    onClick={clearZoneDrawing}
                                    disabled={!isDrawingZone && !showZoneForm}
                                >
                                    <KTIcon iconName='cross' className='fs-1 text-danger' /> Cancel Drawing
                                </button>
                            </div>
                        </div>

                        {/* Zone Form */}
                        {showZoneForm && (
                            <div className='card card-bordered mb-7 border border-dashed  border-primary shadow-sm'>
                                <div className='card-body p-7'>
                                    <h5 className='fs-5 fw-bold card-title mb-4'>{isEditingZone !== null ? 'Edit Zone' : 'New Zone'}</h5>

                                    <div className='row mb-5'>


                                        <FormInput
                                            label='Zone Name'
                                            name='name'
                                            value={zoneFormData.name}
                                            onChange={handleZoneChange}
                                            placeholder='Enter zone name'
                                            error={zoneErrors.name}
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
                                                setActiveZone(null)
                                                setIsEditingZone(null)
                                                setShowZoneForm(false)
                                                setZoneFormData({ name: '', border_color: 'bg-success', fill_color: 'bg-success' })
                                                if (zonePolygonRef.current) zonePolygonRef.current.setMap(null)
                                                setNewZoneCoordinates([])
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button type='button' className='btn btn-light-success' onClick={handleZoneSubmit} disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <>
                                                    <span className='spinner-border spinner-border-sm me-2'></span> Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <i className='fa-regular fa-floppy-disk fs-5'></i> Save Zone
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pole Form */}
                        {(isAddingPole || isEditingPole) && (
                            <div className='card card-bordered mb-7 border border-dashed  border-info shadow-sm '>
                                <div className='card-body p-7'>
                                    <h5 className='fs-5 fw-bold card-title mb-4'>
                                        <i className='fas fa-map-marker-alt me-2'></i>
                                        {isEditingPole ? 'Edit Pole' : 'Add New Pole'}
                                    </h5>

                                    <div className='row mb-5'>

                                        <FormInput
                                            label='Pole Code'
                                            name='code'
                                            value={poleFormData.code}
                                            onChange={handlePoleChange}
                                            placeholder='Enter pole code'
                                            error={poleErrors.code}
                                            required
                                            className="col-md-4 mb-5 mb-md-0"
                                        />

                                        <FormInput
                                            label='Router IP'
                                            name='router_ip'
                                            value={poleFormData.router_ip}
                                            onChange={handlePoleChange}
                                            placeholder='Enter router IP'
                                            error={poleErrors.router_ip}
                                            required
                                            className="col-md-4 mb-5 mb-md-0"
                                        />

                                        <FormInput
                                            label='Router VPN IP'
                                            name='router_vpn_ip'
                                            value={poleFormData.router_vpn_ip}
                                            onChange={handlePoleChange}
                                            placeholder='Enter VPN IP'
                                            error={poleErrors.router_vpn_ip}
                                            required
                                            className="col-md-4 mb-5 mb-md-0"
                                        />

                                    </div>

                                    {newPole && (
                                        <div className='notice d-flex bg-light-success rounded border-success border border-dashed p-4 mb-5'>
                                            <i className='fas fa-check-circle text-success me-2 mt-1'></i>
                                            <div className='fw-semibold'>
                                                Pole position: Lat {newPole.lat.toFixed(6)}, Lng {newPole.lng.toFixed(6)}
                                            </div>
                                        </div>
                                    )}

                                    <div className='d-flex justify-content-end gap-3'>
                                        <button type='button' className='btn btn-light' onClick={cancelPoleAction}>
                                            Cancel
                                        </button>
                                        <button type='button' className='btn btn-light-info' onClick={handlePoleSubmit} disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <>
                                                    <span className='spinner-border spinner-border-sm me-2'></span> Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <i className='fa-regular fa-floppy-disk fs-5'></i> {isEditingPole ? 'Update' : 'Save'} Pole
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Camera Form */}
                        {(isAddingCamera || isEditingCamera) && (
                            <div className='card card-bordered mb-7 border border-dashed  border-primary shadow-sm '>
                                <div className='card-body p-7'>
                                    <h5 className='fs-5 fw-bold card-title mb-4'>
                                        <i className='fas fa-video me-2'></i>
                                        {isEditingCamera ? 'Edit Camera' : 'Add New Camera'}
                                    </h5>

                                    <div className='row mb-5'>



                                        <div className='col-md-4 mb-5 mb-md-0'>
                                            <label className='form-label fw-bold'>Selected Pole</label>
                                            <input
                                                type='text'
                                                className='form-control form-control-solid'
                                                value={poles.find((p) => p.id === selectedPoleForCamera)?.code || ''}
                                                disabled
                                            />
                                        </div>

                                        <FormInput
                                            label='Camera IP'
                                            name='camera_ip'
                                            value={cameraFormData.camera_ip}
                                            onChange={handleCameraChange}
                                            placeholder='Enter camera IP'
                                            error={cameraErrors.camera_ip}
                                            required
                                            className="col-md-4 mb-5 mb-md-0"
                                        />

                                        <FormInput
                                            label='Number of Parking'
                                            name='number_of_parking'
                                            type='number'
                                            value={cameraFormData.number_of_parking}
                                            onChange={handleCameraChange}
                                            placeholder='Enter number of parking spots'
                                            error={cameraErrors.number_of_parking}
                                            required
                                            className="col-md-4"
                                        />

                                    </div>

                                    <div className='d-flex justify-content-end gap-3'>
                                        <button type='button' className='btn btn-light' onClick={cancelCameraAction}>
                                            Cancel
                                        </button>
                                        <button type='button' className='btn btn-warning' onClick={handleCameraSubmit} disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <>
                                                    <span className='spinner-border spinner-border-sm me-2'></span> Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <i className='fa-regular fa-floppy-disk fs-5'></i> {isEditingCamera ? 'Update' : 'Save'} Camera
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Zones List */}
                        <div className='card shadow-none mb-7'>
                            <div className='card-body p-0'>
                                <div className='table-responsive'>
                                    <table className='table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4 mb-0'>
                                        <thead>
                                            <tr className='fw-bold text-muted bg-light'>
                                                <th className='min-w-150px rounded-start ps-7'>Zone Name</th>
                                                <th className='min-w-100px'>Colors</th>
                                                <th className='min-w-100px text-end rounded-end pe-7'>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {zones.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className='text-center text-muted py-8'>
                                                        <span className='text-gray-500'>No zones created yet. Click "New Zone" to create one.</span>
                                                    </td>
                                                </tr>
                                            )}

                                            {zones.map((zone) => (
                                                <tr key={zone.id}>
                                                    <td className='ps-7'>
                                                        <span className='fw-bold'>{zone.name}</span>
                                                    </td>
                                                    <td>
                                                        <div className='d-flex align-items-center gap-2'>
                                                            <div
                                                                className='border-none'
                                                                style={{
                                                                    width: '1.5rem',
                                                                    height: '1.5rem',
                                                                    backgroundColor: metronicColorToHex(zone.border_color || 'bg-success'),
                                                                    borderRadius: '50%',
                                                                }}
                                                            ></div>
                                                            <div
                                                                className='border-none'
                                                                style={{
                                                                    width: '1.5rem',
                                                                    height: '1.5rem',
                                                                    backgroundColor: metronicColorToHex(zone.fill_color || 'bg-success'),
                                                                    borderRadius: '50%',
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </td>
                                                    <td className='text-end pe-7'>
                                                        <button
                                                            type='button'
                                                            className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-2'
                                                            onClick={() => handleEditZone(zone.id)}
                                                        >
                                                            <i className='fa-regular fa-pen-to-square fs-5 text-primary'></i>
                                                        </button>
                                                        <button
                                                            type='button'
                                                            className='btn btn-icon btn-bg-light btn-active-color-danger btn-sm'
                                                            onClick={() => handleDeleteZone(zone.id)}
                                                        >
                                                            <i className='fa-regular fa-trash-can fs-5 text-danger'></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Poles List - Grouped by Zone */}
                        {poles.length > 0 && (
                            <div className='card shadow-sm'>
                                <div className='card-header border-0 pt-5'>
                                    <h3 className='card-title align-items-start flex-column'>
                                        <span className='card-label fw-bold fs-5 mb-1'>Poles & Cameras</span>
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
                                                        <i className='fas fa-draw-polygon text-success fs-3 me-3'></i>
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
                                                                                    <i className='fas fa-map-marker-alt text-primary me-2'></i>
                                                                                    <span className='fw-bold'>{pole.code}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td>
                                                                                <span className='text-muted fw-semibold'>{pole.router_ip || '-'}</span>
                                                                            </td>
                                                                            <td>
                                                                                <span className='text-muted fw-semibold'>{pole.router_vpn_ip || '-'}</span>
                                                                            </td>
                                                                            <td>
                                                                                <span className='text-muted fs-8'>
                                                                                    {Number(pole.lat).toFixed(4)}, {Number(pole.lng).toFixed(4)}
                                                                                </span>
                                                                            </td>
                                                                            <td>
                                                                                <span className='badge badge-light-primary'>{poleCameras.length} camera{poleCameras.length !== 1 ? 's' : ''}</span>
                                                                            </td>
                                                                            <td className='text-end pe-7'>
                                                                                <button
                                                                                    type='button'
                                                                                    className='btn btn-icon btn-bg-light btn-active-color-warning btn-sm me-2'
                                                                                    onClick={() => startAddingCamera(pole.id)}
                                                                                    title='Add camera'
                                                                                >
                                                                                    <i className='fa-regular fa-camera-cctv fs-5 text-info'></i>
                                                                                </button>
                                                                                <button
                                                                                    type='button'
                                                                                    className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-2'
                                                                                    onClick={() => startEditingPole(pole)}
                                                                                    title='Edit pole'
                                                                                >
                                                                                    <i className='fa-regular fa-pen-to-square fs-5 text-primary'></i>
                                                                                </button>
                                                                                <button
                                                                                    type='button'
                                                                                    className='btn btn-icon btn-bg-light btn-active-color-danger btn-sm'
                                                                                    onClick={() => handleDeletePole(pole.id)}
                                                                                    title='Delete pole'
                                                                                >
                                                                                    <i className='fa-regular fa-trash-can fs-5 text-danger'></i>
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                        {/* Camera rows */}
                                                                        {poleCameras.map((camera) => (
                                                                            <tr key={`camera-${camera.id}`} className='bg-light-warning'>
                                                                                <td className='ps-12'>
                                                                                    <div className='d-flex align-items-center'>
                                                                                        <i className='fas fa-video text-warning me-2'></i>
                                                                                        <span className='text-muted'>Camera</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td colSpan={2}>
                                                                                    <span className='fw-semibold'>{camera.camera_ip}</span>
                                                                                </td>
                                                                                <td>
                                                                                    <span className='badge badge-light-info'>
                                                                                        {camera.number_of_parking} parking spots
                                                                                    </span>
                                                                                </td>
                                                                                <td></td>
                                                                                <td className='text-end pe-7'>
                                                                                    <button
                                                                                        type='button'
                                                                                        className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-2'
                                                                                        onClick={() => startEditingCamera(camera)}
                                                                                        title='Edit camera'
                                                                                    >
                                                                                        <i className='fa-regular fa-pen-to-square fs-5 text-primary'></i>
                                                                                    </button>
                                                                                    <button
                                                                                        type='button'
                                                                                        className='btn btn-icon btn-bg-light btn-active-color-danger btn-sm'
                                                                                        onClick={() => handleDeleteCamera(camera.id)}
                                                                                        title='Delete camera'
                                                                                    >
                                                                                        <i className='fa-regular fa-trash-can fs-5 text-danger'></i>
                                                                                    </button>
                                                                                </td>
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
                    </div>

                    {/* Action Buttons */}

                    <div className='d-flex justify-content-end'>
                        <button type='button' className='btn btn-primary px-6 py-3' onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <span className='spinner-border spinner-border-sm me-2'></span> Saving Changes...
                                </>
                            ) : (
                                <>
                                    <i className='fa-regular fa-floppy-disk fs-5'></i> Save Location
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export { EditLocation }