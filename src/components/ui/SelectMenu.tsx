import { Button, Flex, Menu, Portal, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { LuChevronDown } from 'react-icons/lu'
import { InfoTooltip } from './InfoTooltip'

export interface SelectMenuProps<V extends string> {
  label: ReactNode
  infoText?: string
  value: V
  options: { value: V; label: string }[]
  onChange: (value: V) => void
  /** what the button shows; the selected option's label by default */
  display?: ReactNode
}

/** A labelled setting with a fixed set of choices, picked from a menu. */
export function SelectMenu<V extends string>(props: SelectMenuProps<V>) {
  const { label, infoText, value, options, onChange } = props
  const selected = options.find((option) => option.value === value)
  return (
    <Flex alignItems="center" justifyContent="space-between" gap={2}>
      <Flex alignItems="center">
        <Text>{label}</Text>
        {infoText && <InfoTooltip infoText={infoText} />}
      </Flex>
      <Menu.Root
        lazyMount
        positioning={{ placement: 'right-start' }}
        onSelect={(details) => onChange(details.value as V)}
      >
        <Menu.Trigger asChild>
          <Button size="sm" variant="outline" colorPalette="gray" flexShrink={0}>
            {props.display ?? selected?.label ?? value}
            <LuChevronDown />
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              {options.map((option) => (
                <Menu.Item key={option.value} value={option.value}>
                  {option.label}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Flex>
  )
}
