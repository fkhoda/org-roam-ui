import { Toggle } from '@carbon/react'
import { useId } from 'react'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <Toggle
      id={useId()}
      size="sm"
      hideLabel
      labelText={label}
      labelA=""
      labelB=""
      toggled={checked}
      onToggle={onChange}
    />
  )
}
