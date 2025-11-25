// components/common/ColorSelect.tsx
import React from 'react'
import { colorOptions, metronicColorToHex } from '../../utils/colorUtils'

interface ColorSelectProps {
    label: string
    name: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    error?: string
    required?: boolean
    className?: string
    showPreview?: boolean
}

export const ColorSelect: React.FC<ColorSelectProps> = ({
    label,
    name,
    value,
    onChange,
    error,
    required = false,
    className = '',
    showPreview = true,
}) => {
    return (
        <div className={`mb-7 ${className}`}>
            <label className='form-label fs-6 fw-semibold'>
                {label}
                {required && <span className='text-danger ms-1'>*</span>}
            </label>
            <div className='d-flex align-items-center gap-3'>
                <select
                    name={name}
                    className={`form-select form-select-solid ${error ? 'is-invalid' : ''}`}
                    value={value}
                    onChange={onChange}
                    style={{ flex: 1 }}
                >
                    {colorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {showPreview && (
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            backgroundColor: metronicColorToHex(value),
                            borderRadius: 4,
                        }}
                    ></div>
                )}
            </div>
            {error && <div className='text-danger mt-2 fs-7'>{error}</div>}
        </div>
    )
}