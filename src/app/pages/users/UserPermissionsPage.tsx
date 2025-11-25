import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { PageTitle } from '../../../_metronic/layout/core'

const API_URL = import.meta.env.VITE_APP_API_URL || '/api'

interface Permission {
  id: number
  name: string
  key: string
  description: string
  status: number
}

export const UserPermissionsPage: React.FC<{ token: string }> = ({ token }) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/user/${id}/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPermissions(res.data.data)
    } catch {
      toast.error('Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {}
    permissions.forEach((perm) => {
      const group = perm.key.split('_')[1] || 'general'
      if (!groups[group]) groups[group] = []
      groups[group].push(perm)
    })
    return groups
  }, [permissions])

  const handleToggle = (permId: number) => {
    setPermissions((prev) =>
      prev.map((p) => (p.id === permId ? { ...p, status: p.status ? 0 : 1 } : p))
    )
  }

  const handleSelectAll = (group: string, checked: boolean) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.key.includes(`_${group}`) ? { ...p, status: checked ? 1 : 0 } : p
      )
    )
  }

  const handleSave = async () => {
    const enabled = permissions.filter((p) => p.status === 1).map((p) => p.id)
    const formData = new FormData()
    formData.append('permissions', JSON.stringify(enabled))

    setSaving(true)
    try {
      await axios.put(`${API_URL}/user-permissions/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Permissions updated successfully!')
    } catch {
      toast.error('Failed to update permissions')
    } finally {
      setSaving(false)
    }
  }

  const filteredPermissions = useMemo(() => {
    if (!search.trim()) return groupedPermissions
    const term = search.toLowerCase()
    const filtered: Record<string, Permission[]> = {}
    Object.keys(groupedPermissions).forEach((group) => {
      const perms = groupedPermissions[group].filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term)
      )
      if (perms.length) filtered[group] = perms
    })
    return filtered
  }, [search, groupedPermissions])

  if (loading)
    return (
      <div className='text-center py-20'>
        <span className='spinner-border text-primary'></span>
        <p className='mt-3 text-gray-600'>Loading permissions...</p>
      </div>
    )

  return (
    <>
      <PageTitle breadcrumbs={[]}>User Permissions</PageTitle>
      <div className='card'>
        <div className='card-body p-9'>
          <div className='d-flex justify-content-between align-items-center mb-6'>
            <h2 className='fs-2x fw-bold'>Manage Permissions</h2>
            <input
              type='text'
              className='form-control w-250px'
              placeholder='Search permissions...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {Object.entries(filteredPermissions).map(([group, perms]) => (
            <div key={group} className='mb-8 border rounded p-5 shadow-sm'>
              <div className='d-flex justify-content-between align-items-center mb-3'>
                <h5 className='fw-bold text-capitalize mb-0'>
                  {group.replace(/_/g, ' ')}
                </h5>
                <div className='form-check form-switch'>
                  <input
                    className='form-check-input'
                    type='checkbox'
                    id={`select-all-${group}`}
                    checked={perms.every((p) => p.status === 1)}
                    onChange={(e) => handleSelectAll(group, e.target.checked)}
                  />
                  <label
                    className='form-check-label text-muted'
                    htmlFor={`select-all-${group}`}
                  >
                    Select All
                  </label>
                </div>
              </div>

              <div className='row g-3'>
                {perms.map((p) => (
                  <div key={p.id} className='col-md-6 col-lg-4'>
                    <div className='d-flex align-items-center justify-content-between bg-light rounded p-3'>
                      <div>
                        <div className='fw-semibold'>{p.name}</div>
                        <div className='text-muted small'>{p.description}</div>
                      </div>
                      <div className='form-check form-switch'>
                        <input
                          className='form-check-input'
                          type='checkbox'
                          checked={p.status === 1}
                          onChange={() => handleToggle(p.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className='d-flex justify-content-end mt-6'>
            <button className='btn btn-light me-3' onClick={() => navigate('/users')}>
              Cancel
            </button>
            <button
              className='btn btn-primary'
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
