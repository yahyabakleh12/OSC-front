import { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../core/Auth'
import { login } from '../core/_requests'

// ✅ Simplified validation: only "required"
const loginSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  password: Yup.string().required('Password is required'),
})

const initialValues = {
  username: '',
  password: '',
}

export function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { saveAuth } = useAuth()

  const formik = useFormik({
    initialValues,
    validationSchema: loginSchema,
    onSubmit: async (values, { setStatus, setSubmitting }) => {
      setLoading(true)
      try {
        const { data } = await login(values.username, values.password)
        localStorage.setItem('token', data.token)
        saveAuth({ api_token: data.token })

        navigate('/dashboard', { replace: true })
      } catch (error) {
        console.error('Login failed:', error)
        setStatus('Invalid username or password')
        saveAuth(undefined)
      } finally {
        setSubmitting(false)
        setLoading(false)
      }
    },
  })

  return (
    <form className='form w-100' onSubmit={formik.handleSubmit} noValidate>
      <div className='text-center mb-8'>
        <h1 className='text-gray-900 fw-bolder mb-3'>Sign In</h1>
        <div className='text-gray-500 fw-semibold fs-6'>
          Enter your credentials to access your account
        </div>
      </div>

      {formik.status && (
        <div className='text-danger text-center mb-5 fs-4'>{formik.status}</div>
      )}

      {/* Username */}
      <div className='fv-row mb-8'>
        {/* ✅ Changed label color to red */}
        <label className='form-label fs-6 fw-bolder'>Username</label>
        <input
          placeholder='Username'
          {...formik.getFieldProps('username')}
          className={clsx(
            'form-control bg-transparent',
            { 'is-invalid': formik.touched.username && formik.errors.username },
            { 'is-valid': formik.touched.username && !formik.errors.username }
          )}
          type='text'
          name='username'
          autoComplete='off'
        />
        {formik.touched.username && formik.errors.username && (
          <div className='fv-plugins-message-container'>
            <span role='alert' className='text-danger'>
              {formik.errors.username}
            </span>
          </div>
        )}
      </div>

      {/* Password */}
      <div className='fv-row mb-8'>
        {/* ✅ Changed label color to red */}
        <label className='form-label fw-bolder fs-6 mb-0'>
          Password
        </label>
        <input
          placeholder='Password'
          type='password'
          autoComplete='off'
          {...formik.getFieldProps('password')}
          className={clsx(
            'form-control bg-transparent',
            { 'is-invalid': formik.touched.password && formik.errors.password },
            { 'is-valid': formik.touched.password && !formik.errors.password }
          )}
        />
        {formik.touched.password && formik.errors.password && (
          <div className='fv-plugins-message-container'>
            <div className='fv-help-block'>
              <span role='alert' className='text-danger'>
                {formik.errors.password}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Forgot password */}
      <div className='d-flex flex-stack flex-wrap gap-3 fs-base fw-semibold mb-8'>
        <div />
        <a href='/auth/forgot-password' className='link-primary'>
          Forgot Password?
        </a>
      </div>

      {/* Submit button */}
      <div className='d-grid mb-10'>
        <button
          type='submit'
          className='btn btn-primary'
          disabled={formik.isSubmitting || !formik.isValid}
        >
          {!loading && <span className='indicator-label'>Continue</span>}
          {loading && (
            <span className='indicator-progress' style={{ display: 'block' }}>
              Please wait...
              <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
            </span>
          )}
        </button>
      </div>
    </form>
  )
}
