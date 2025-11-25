import React, { useState, useEffect } from 'react'
import { deleteUser, getUsers } from '../../modules/auth/core/_requests'
import { PageTitle } from '../../../_metronic/layout/core'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'

interface User {
  id: number
  username: string
  designation: string
  created_at?: string
  updated_at?: string
}

interface UsersResponse {
  message: string
  total: number
  data: User[]
  links: {
    pages: number[]
    currentPage: number
    previousPage: number | null
    nextPage: number | null
    pageCount: number
  }
}

export const UsersListPage: React.FC<{ token: string }> = ({ token }) => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    fetchUsers(currentPage)
  }, [currentPage])

  const fetchUsers = async (page: number) => {
    setLoading(true)
    try {
      const response = await getUsers(token, page, limit)
      const data: UsersResponse = response.data

      setUsers(data.data || [])
      setTotal(data.total || 0)
      setCurrentPage(data.links?.currentPage || 1)
      setTotalPages(data.links?.pageCount || 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to fetch users', {
        position: 'top-right',
        autoClose: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleDelete = async (userId: number) => {
  if (!window.confirm('Are you sure you want to delete this user?')) return
  try {
    await deleteUser(token, userId)
    toast.success('User deleted successfully!')
    fetchUsers(currentPage)
  } catch (error: any) {
    toast.error(error?.response?.data?.message || 'Failed to delete user')
  }
}


  const renderPagination = () => {
    const pages = []
    const maxVisible = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let endPage = Math.min(totalPages, startPage + maxVisible - 1)

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }

    // Previous button
    pages.push(
      <li key='prev' className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
        <button
          className='page-link'
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <i className='ki-outline ki-left fs-4'></i>
        </button>
      </li>
    )

    // First page
    if (startPage > 1) {
      pages.push(
        <li key={1} className='page-item'>
          <button className='page-link' onClick={() => handlePageChange(1)}>
            1
          </button>
        </li>
      )
      if (startPage > 2) {
        pages.push(
          <li key='dots1' className='page-item disabled'>
            <span className='page-link'>...</span>
          </li>
        )
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
          <button className='page-link' onClick={() => handlePageChange(i)}>
            {i}
          </button>
        </li>
      )
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <li key='dots2' className='page-item disabled'>
            <span className='page-link'>...</span>
          </li>
        )
      }
      pages.push(
        <li key={totalPages} className='page-item'>
          <button className='page-link' onClick={() => handlePageChange(totalPages)}>
            {totalPages}
          </button>
        </li>
      )
    }

    // Next button
    pages.push(
      <li
        key='next'
        className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}
      >
        <button
          className='page-link'
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <i className='ki-outline ki-right fs-4'></i>
        </button>
      </li>
    )

    return pages
  }

  return (
    <>
      <PageTitle breadcrumbs={[]}>Users</PageTitle>

      <div className='card'>
        <div className='card-body p-9'>
          {/* Header */}
          <div className='d-flex justify-content-between align-items-center mb-10'>
            <div>
              <h2 className='fs-2x fw-bold text-gray-900 mb-2'>Users List</h2>
              <p className='text-gray-600 fs-6 fw-semibold'>
                Total {total} user{total !== 1 ? 's' : ''}
              </p>
            </div>
            <Link to='/create-user' className='btn btn-primary'>
              <i className='ki-outline ki-plus fs-2'></i>
              Add User
            </Link>
          </div>

          {/* Loading State */}
          {loading && (
            <div className='text-center py-10'>
              <span className='spinner-border spinner-border-lg text-primary'></span>
              <p className='text-gray-600 mt-3'>Loading users...</p>
            </div>
          )}

          {/* Users Table */}
          {!loading && users.length > 0 && (
            <>
              <div className='table-responsive'>
                <table className='table table-row-bordered table-row-gray-300 gy-5 gs-7'>
                  <thead>
                    <tr className='fw-bold fs-6 text-gray-800 border-bottom-2 border-gray-200'>
                      <th className='min-w-50px'>ID</th>
                      <th className='min-w-150px'>
                        <i className='ki-outline ki-user fs-4 me-2'></i>
                        Username
                      </th>
                      <th className='min-w-150px'>
                        <i className='ki-outline ki-badge fs-4 me-2'></i>
                        Designation
                      </th>
                      <th className='min-w-100px text-end'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className='text-gray-800 fw-semibold'>{user.id}</td>
                        <td>
                          <div className='d-flex align-items-center'>
                            <div className='symbol symbol-circle symbol-40px me-3'>
                              <div className='symbol-label bg-light-primary'>
                                <span className='text-primary fw-bold fs-5'>
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className='d-flex flex-column'>
                              <span className='text-gray-800 fw-bold fs-6'>
                                {user.username}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className='text-gray-700 fw-semibold'>
                          <span className='badge badge-light-info fs-7 fw-semibold'>
                            {user.designation}
                          </span>
                        </td>
                        <td className='text-end'>
                          <Link
  to={`/user-permissions/${user.id}`}
  className='btn btn-icon btn-light btn-sm me-2'
  title='Permissions'
>
  <i className='ki-outline ki-lock fs-4 text-warning'></i>
</Link>

                          <Link
  to={`/edit-user/${user.id}`}
  className='btn btn-icon btn-light btn-sm me-2'
  title='Edit'
>
  <i className='ki-outline ki-pencil fs-4 text-primary'></i>
</Link>

                          <button
  className='btn btn-icon btn-light btn-sm'
  title='Delete'
  onClick={() => handleDelete(user.id)}
>
  <i className='ki-outline ki-trash fs-4 text-danger'></i>
</button>

                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className='d-flex justify-content-between align-items-center mt-8'>
                  <div className='text-gray-600 fs-6 fw-semibold'>
                    {total === 0 ? (
                      'No entries to show'
                    ) : (
                      (() => {
                        const start = Math.min((currentPage - 1) * limit + 1, total)
                        const end = Math.min(currentPage * limit, total)
                        return (
                          <>
                            Showing {start} to {end} of {total} entries
                          </>
                        )
                      })()
                    )}
                  </div>
                  <ul className='pagination'>{renderPagination()}</ul>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && users.length === 0 && (
            <div className='text-center py-20'>
              <i className='ki-outline ki-user-square fs-5x text-gray-400 mb-5'></i>
              <h3 className='fs-2 fw-bold text-gray-800 mb-3'>No Users Found</h3>
              <p className='text-gray-600 fs-6 mb-7'>
                Start by adding your first user to the system
              </p>
              <Link to='/create-user' className='btn btn-primary'>
                <i className='ki-outline ki-plus fs-2'></i>
                Create User
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}