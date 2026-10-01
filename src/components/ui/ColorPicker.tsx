import { ChevronDown } from '@carbon/icons-react'
import { Popover, PopoverContent } from '@carbon/react'
import { useState, type ReactNode } from 'react'
import { colorList } from '../../config'
import { cssColor } from '../../theme/palette'

/** A square of a named theme color (`gray.500`); hollow when there is none. */
export function Swatch({ color, size }: { color: string; size?: number }) {
  return (
    <span
      className={`swatch${color ? '' : ' swatch--empty'}`}
      style={{ background: cssColor(color), ...(size && { width: size, height: size }) }}
    />
  )
}

/** The stripes of several colors, e.g. a node color scheme. */
export function SchemeSwatch({ colors }: { colors: string[] }) {
  return (
    <span className="swatch swatch--scheme">
      {colors.map((color) => (
        <span key={color} style={{ background: cssColor(color) }} />
      ))}
    </span>
  )
}

export interface SwatchGridProps {
  colors: string[]
  isSelected: (color: string) => boolean
  onPick: (color: string) => void
  /** extra entries before the colors */
  before?: ReactNode
}

/** A grid of color swatches to pick from. */
export function SwatchGrid({ colors, isSelected, onPick, before }: SwatchGridProps) {
  return (
    <div className="swatch-grid">
      {before}
      {colors.map((color) => (
        <button
          key={color || 'none'}
          type="button"
          aria-label={color || 'No color'}
          aria-pressed={isSelected(color)}
          onClick={() => onPick(color)}
        >
          <Swatch color={color} />
        </button>
      ))}
    </div>
  )
}

/** A button opening a popover beside it; the popover escapes scrolling containers. */
export function PopoverButton({
  label,
  display,
  children,
}: {
  label: string
  display: ReactNode
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onRequestClose={() => setOpen(false)}
      align="right-top"
      autoAlign
      dropShadow
    >
      <button
        type="button"
        className="swatch-button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {display}
        <ChevronDown size={12} />
      </button>
      <PopoverContent>{open && children(() => setOpen(false))}</PopoverContent>
    </Popover>
  )
}

export interface ColorPickerProps {
  label?: string
  value: string
  onChange: (color: string) => void
  /** offer "no color" (an empty string) */
  allowEmpty?: boolean
  /** what the button shows; a swatch of the value by default */
  display?: ReactNode
  /** an extra choice before the colors, e.g. "same as the nodes" */
  extra?: { label: string; display: ReactNode; value: string }
}

/** Pick one of the theme's named colors. */
export function ColorPicker({
  label,
  value,
  onChange,
  allowEmpty = true,
  display,
  extra,
}: ColorPickerProps) {
  const picker = (
    <PopoverButton
      label={`Pick ${label ?? 'a'} color`}
      display={display ?? <Swatch color={value} />}
    >
      {(close) => (
        <SwatchGrid
          colors={[...(allowEmpty ? [''] : []), ...colorList]}
          isSelected={(color) => color === value}
          onPick={(color) => {
            onChange(color)
            close()
          }}
          before={
            extra && (
              <button
                type="button"
                aria-label={extra.label}
                aria-pressed={value === extra.value}
                onClick={() => {
                  onChange(extra.value)
                  close()
                }}
              >
                {extra.display}
              </button>
            )
          }
        />
      )}
    </PopoverButton>
  )
  if (!label) return picker
  return (
    <div className="setting-row">
      <span>{label}</span>
      {picker}
    </div>
  )
}
