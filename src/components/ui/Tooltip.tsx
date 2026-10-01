import { Portal, Tooltip as ChakraTooltip } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'

export interface TooltipProps {
  content: ReactNode
  children: ReactElement
  placement?: 'top' | 'bottom' | 'left' | 'right'
  showArrow?: boolean
}

/** A hover tooltip around a single focusable element. */
export function Tooltip({ content, children, placement = 'bottom', showArrow }: TooltipProps) {
  return (
    <ChakraTooltip.Root positioning={{ placement }} openDelay={400} closeDelay={100} lazyMount>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content maxW="xs">
            {showArrow && (
              <ChakraTooltip.Arrow>
                <ChakraTooltip.ArrowTip />
              </ChakraTooltip.Arrow>
            )}
            {content}
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  )
}
