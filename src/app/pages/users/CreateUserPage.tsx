import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUser } from '../../modules/auth/core/_requests'
import { PageTitle } from '../../../_metronic/layout/core'
import { toast } from 'react-toastify'


export const CreateUserPage: React.FC<{ token: string }> = ({ token }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [designation, setDesignation] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    formData.append('designation', designation)

    try {
      const res = await createUser(token, formData)
      toast.success(res?.message || 'User created successfully!', {
        position: 'top-right',
        autoClose: 3000,
      })
      setUsername('')
      setPassword('')
      setDesignation('')
    } catch (err: any) {
  const msg = err?.response?.data?.error || err?.response?.data?.message

  if (msg?.includes('Duplicate entry') && msg?.includes('username_UNIQUE')) {
    toast.error('That username is already taken. Please choose another one.', {
      position: 'top-right',
      autoClose: 4000,
    })
  } else {
    toast.error(msg || 'Failed to create user', {
      position: 'top-right',
      autoClose: 4000,
    })
  }
} finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageTitle breadcrumbs={[]}>Create User</PageTitle>

      <div className='card'>
        <div className='card-body p-9'>
          {/* Minimal Header */}
          <div className='d-flex justify-content-between align-items-center mb-10'>
  <div>
    <h2 className='fs-2x fw-bold text-gray-900 mb-2'>Create New User</h2>
    <p className='text-gray-600 fs-6 fw-semibold'>
      Add a new user to the system
    </p>
  </div>
  <Link to='/users' className='btn btn-light-primary fw-bold'>
    <i className='ki-outline ki-arrow-left fs-3 me-2'></i>
    Back to Users List
  </Link>
</div>


          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className='mb-8'>
              <label className='form-label fs-6 fw-semibold text-gray-700 mb-3'>
                <i className='ki-outline ki-user fs-3 me-2'></i>
                Username
              </label>
              <input
                type='text'
                className='form-control form-control-lg'
                placeholder='Enter username'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className='mb-8'>
              <label className='form-label fs-6 fw-semibold text-gray-700 mb-3'>
                <i className='ki-outline ki-lock fs-3 me-2'></i>
                Password
              </label>
              <input
                type='password'
                className='form-control form-control-lg'
                placeholder='Enter password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Designation */}
            <div className='mb-10'>
              <label className='form-label fs-6 fw-semibold text-gray-700 mb-3'>
                <i className='ki-outline ki-badge fs-3 me-2'></i>
                Designation
              </label>
              <input
                type='text'
                className='form-control form-control-lg'
                placeholder='Enter designation'
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
              />
            </div>

            {/* Submit Button */}
            <div className='d-flex justify-content-end'>
              <button
                type='submit'
                className='btn btn-primary btn-lg px-10'
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className='spinner-border spinner-border-sm me-2'></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className='ki-outline ki-check fs-2 me-2'></i>
                    Create User
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}