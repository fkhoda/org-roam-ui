import { Tooltip as CarbonTooltip } from '@carbon/react'
import type { HTMLAttributes, ReactElement, ReactNode } from 'react'

export interface TooltipProps {
  content: ReactNode
  children: ReactElement<HTMLAttributes<HTMLElement>>
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

/** A hover tooltip around a single focusable element. */
export function Tooltip({ content, children, placement = 'bottom' }: TooltipProps) {
  return (
    <CarbonTooltip label={content} align={placement} enterDelayMs={400} leaveDelayMs={100}>
      {children}
    </CarbonTooltip>
  )
}
