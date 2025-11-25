// components/common/FormInput.tsx
import React from 'react'

interface FormInputProps {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  error?: string
  type?: 'text' | 'password' | 'email' | 'number' | 'tel'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  rows?: number
  isTextarea?: boolean
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  placeholder = '',
  required = false,
  disabled = false,
  className = '',
  rows = 3,
  isTextarea = false,
}) => {
  return (
    <div className={className}>
      <label className='form-label fw-bold'>
        {label}
        {required && <span className='text-danger ms-1'>*</span>}
      </label>
      {isTextarea ? (
        <textarea
          name={name}
          className={`form-control form-control-solid ${error ? 'is-invalid' : ''}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
        />
      ) : (
        <input
          name={name}
          type={type}
          className={`form-control form-control-solid ${error ? 'is-invalid' : ''}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
      {error && <div className='invalid-feedback d-block'>{error}</div>}
    </div>
  )
}