export const metronicColorToHex = (className: string): string => {
  switch (className) {
    case 'bg-primary':
      return '#009EF7'
    case 'bg-danger':
      return '#F1416C'
    case 'bg-success':
      return '#50CD89'
    case 'bg-warning':
      return '#FFC700'
    case 'bg-info':
      return '#7239EA'
    case 'bg-dark':
      return '#181C32'
    default:
      return className
  }
}

export const colorOptions = [
  { value: 'bg-primary', label: 'Blue' },
  { value: 'bg-danger', label: 'Red' },
  { value: 'bg-success', label: 'Green' },
  { value: 'bg-warning', label: 'Yellow' },
  { value: 'bg-info', label: 'Purple' },
  { value: 'bg-dark', label: 'Black' },
]