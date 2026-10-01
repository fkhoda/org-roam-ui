import { Box, Button, Flex, Popover, Portal, Text, type BoxProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { LuChevronDown } from 'react-icons/lu'
import { colorList } from '../../config'

/** A square of a named theme color (`gray.500`); hollow when there is none. */
export function Swatch({ color, ...rest }: { color: string } & BoxProps) {
  return (
    <Box
      bg={color || 'transparent'}
      borderRadius="sm"
      borderWidth={color ? 0 : 1}
      borderColor="gray.600"
      height={5}
      width={5}
      flexShrink={0}
      {...rest}
    />
  )
}

/** The stripes of several colors, e.g. a node color scheme. */
export function SchemeSwatch({ colors }: { colors: string[] }) {
  return (
    <Flex
      height={5}
      width={5}
      flexDirection="column"
      flexWrap="wrap"
      borderRadius="sm"
      overflow="hidden"
    >
      {colors.map((color) => (
        <Box key={color} bg={color} flex="1 1 6px" />
      ))}
    </Flex>
  )
}

export interface ColorPickerProps {
  label?: ReactNode
  value: string
  onChange: (color: string) => void
  /** offer "no color" (an empty string) */
  allowEmpty?: boolean
  /** what the button shows; a swatch of the value by default */
  display?: ReactNode
  /** an extra choice before the colors, e.g. "same as the nodes" */
  extra?: { label: string; display: ReactNode; value: string }
}

/** Pick one of the theme's named colors from a palette. */
export function ColorPicker({
  label,
  value,
  onChange,
  allowEmpty = true,
  display,
  extra,
}: ColorPickerProps) {
  return (
    <Flex alignItems="center" justifyContent="space-between" gap={2}>
      {label && <Text>{label}</Text>}
      <Popover.Root lazyMount positioning={{ placement: 'right-start' }}>
        <Popover.Trigger asChild>
          <Button
            size="sm"
            variant="outline"
            colorPalette="gray"
            aria-label={`Pick ${label ?? 'a'} color`}
          >
            {display ?? <Swatch color={value} />}
            <LuChevronDown />
          </Button>
        </Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content width="auto" maxW="44">
              <Popover.Body p={2}>
                <Flex flexWrap="wrap" gap={1}>
                  {extra && (
                    <Popover.CloseTrigger asChild>
                      <Box
                        as="button"
                        aria-label={extra.label}
                        onClick={() => onChange(extra.value)}
                        cursor="pointer"
                      >
                        {extra.display}
                      </Box>
                    </Popover.CloseTrigger>
                  )}
                  {[...(allowEmpty ? [''] : []), ...colorList].map((color) => (
                    <Popover.CloseTrigger asChild key={color || 'none'}>
                      <Swatch
                        as="button"
                        aria-label={color || 'No color'}
                        color={color}
                        cursor="pointer"
                        outline={color === value ? '2px solid' : undefined}
                        outlineColor="accent.fg"
                        outlineOffset="1px"
                        onClick={() => onChange(color)}
                      />
                    </Popover.CloseTrigger>
                  ))}
                </Flex>
              </Popover.Body>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
    </Flex>
  )
}
