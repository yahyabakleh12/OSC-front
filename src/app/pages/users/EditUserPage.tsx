import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '../../../_metronic/layout/core'
import { updateUser, getUsers } from '../../modules/auth/core/_requests'
import { toast } from 'react-toastify'

interface User {
    id: number
    username: string
    designation: string
}

export const EditUserPage: React.FC<{ token: string }> = ({ token }) => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(false)
    const [username, setUsername] = useState('')
    const [designation, setDesignation] = useState('')

    useEffect(() => {
        fetchUser()
    }, [])

    const fetchUser = async () => {
        setLoading(true)
        try {
            const response = await getUsers(token, 1, 100) // quick fetch all to locate user
            const foundUser = response.data.data.find((u: User) => u.id === Number(id))
            if (!foundUser) {
                toast.error('User not found')
                navigate('/users')
                return
            }
            setUser(foundUser)
            setUsername(foundUser.username)
            setDesignation(foundUser.designation)
        } catch (error: any) {
            toast.error('Failed to load user')
            navigate('/users')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!username || !designation) {
    toast.error('Username and designation are required')
    return
  }

  const formData = new FormData()
  formData.append('username', username)
  formData.append('designation', designation)

  // ✅ only send password if user actually entered one
  const passwordInput = (document.getElementById('password') as HTMLInputElement)?.value
  if (passwordInput && passwordInput.trim() !== '') {
    formData.append('password', passwordInput)
  }

  try {
    await updateUser(token, Number(id), formData)
    toast.success('User updated successfully!')
    navigate('/users')
  } catch (error: any) {
    const msg = error?.response?.data?.error || error?.response?.data?.message
    if (msg?.includes('Duplicate entry') && msg?.includes('username_UNIQUE')) {
      toast.error('That username is already taken. Please choose another one.')
    } else {
      toast.error(msg || 'Update failed')
    }
  }
}


    if (loading) {
        return (
            <div className='text-center py-20'>
                <span className='spinner-border text-primary'></span>
                <p className='mt-3 text-gray-600'>Loading user...</p>
            </div>
        )
    }

    if (!user) return null

    return (
        <>
            <PageTitle breadcrumbs={[]}>Edit User</PageTitle>
            <div className='card'>
                <div className='card-body p-9'>
                    <h2 className='fs-2x fw-bold mb-8'>Edit User</h2>

                    <form onSubmit={handleSubmit} className='w-100'>
                        <div className='mb-6'>
                            <label className='form-label fw-semibold text-gray-700'>
                                Username
                            </label>
                            <input
  type='text'
  className='form-control form-control-solid'
  value={username || ''}
  onChange={(e) => setUsername(e.target.value)}
  placeholder='Enter username'
/>

                        </div>

                        <div className='mb-6'>
  <label className='form-label fw-semibold text-gray-700'>
    Password (leave blank to keep existing)
  </label>
  <input
    id='password'
    type='password'
    className='form-control form-control-solid'
    placeholder='Enter new password (optional)'
  />
</div>


                        <div className='mb-6'>
                            <label className='form-label fw-semibold text-gray-700'>
                                Designation
                            </label>
                            <input
                                type='text'
                                className='form-control form-control-solid'
                                value={designation}
                                onChange={(e) => setDesignation(e.target.value)}
                                placeholder='Enter designation'
                            />
                        </div>

                        <div className='d-flex justify-content-end'>
                            <button
                                type='button'
                                className='btn btn-light me-3'
                                onClick={() => navigate('/users')}
                            >
                                Cancel
                            </button>
                            <button type='submit' className='btn btn-primary'>
                                <i className='ki-outline ki-check fs-2 me-2'></i>
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}
