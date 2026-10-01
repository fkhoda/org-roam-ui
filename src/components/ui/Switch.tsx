import { Switch as ChakraSwitch } from '@chakra-ui/react'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <ChakraSwitch.Root
      size="sm"
      checked={checked}
      onCheckedChange={(details) => onChange(details.checked)}
      aria-label={label}
    >
      <ChakraSwitch.HiddenInput />
      <ChakraSwitch.Control>
        <ChakraSwitch.Thumb />
      </ChakraSwitch.Control>
    </ChakraSwitch.Root>
  )
}
