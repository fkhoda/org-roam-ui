import { FilterableMultiSelect, Slider, Stack } from '@carbon/react'
import { useId, type ReactNode } from 'react'
import { InfoTooltip } from '../ui/InfoTooltip'
import { Switch } from '../ui/Switch'

/** A column of settings. */
export function SettingsStack({ children }: { children: ReactNode }) {
  return <Stack gap={3}>{children}</Stack>
}

function Label({ label, infoText }: { label: ReactNode; infoText?: string }) {
  return (
    <span className="setting-row__label">
      {label}
      {infoText && <InfoTooltip infoText={infoText} />}
    </span>
  )
}

export interface SliderSettingProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  infoText?: string
}

/** A numeric setting. */
export function SliderSetting({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 0.1,
  infoText,
}: SliderSettingProps) {
  const decimals = Number.isInteger(step) ? 0 : step < 0.1 ? 2 : 1
  return (
    <div className="slider-setting">
      <div className="setting-row">
        <Label label={label} infoText={infoText} />
        <span>{value.toFixed(decimals)}</span>
      </div>
      <Slider
        id={useId()}
        labelText={label}
        hideLabel
        hideTextInput
        min={min}
        max={max}
        step={step}
        value={value}
        formatLabel={(n) => n.toFixed(decimals)}
        onChange={({ value }) => onChange(Number(value))}
      />
    </div>
  )
}

export interface ToggleSettingProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  infoText?: string
  /** settings that only apply when this one is on */
  children?: ReactNode
}

/** An on/off setting, revealing its sub-settings when on. */
export function ToggleSetting({ label, value, onChange, infoText, children }: ToggleSettingProps) {
  return (
    <div>
      <div className="setting-row">
        <Label label={label} infoText={infoText} />
        <Switch checked={value} onChange={onChange} label={label} />
      </div>
      {children && value && <div className="setting-children">{children}</div>}
    </div>
  )
}

export interface ListSettingProps {
  label: string
  /** what can be in the list */
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  /** shown instead of each item, e.g. without the roam directory */
  format?: (item: string) => string
}

/** A list of items (tags, directories) picked from the options. */
export function ListSetting({
  label,
  options,
  value,
  onChange,
  format = (x) => x,
}: ListSettingProps) {
  // keep chosen items that aren't offered anymore (a tag no note has now)
  const items = [...new Set([...options, ...value])]
  return (
    <FilterableMultiSelect<string>
      id={useId()}
      className="list-setting"
      size="sm"
      titleText={label}
      placeholder={items.length ? 'Filter…' : 'Nothing to pick'}
      items={items}
      itemToString={(item) => (item ? format(item) : '')}
      selectedItems={value}
      onChange={({ selectedItems }) => onChange(selectedItems ?? [])}
    />
  )
}
