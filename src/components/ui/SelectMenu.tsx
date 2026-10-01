import { Dropdown } from '@carbon/react'
import { useId, type ReactNode } from 'react'
import { InfoTooltip } from './InfoTooltip'

export interface Option<V extends string> {
  value: V
  label: string
}

export interface SelectMenuProps<V extends string> {
  label: string
  infoText?: string
  value: V
  options: Option<V>[]
  onChange: (value: V) => void
  /** what the closed menu shows; the selected option's label by default */
  display?: ReactNode
}

/** A labelled setting with a fixed set of choices. */
export function SelectMenu<V extends string>(props: SelectMenuProps<V>) {
  const { label, infoText, value, options, onChange, display } = props
  const selected = options.find((option) => option.value === value)
  return (
    <div className="setting-row">
      <span className="setting-row__label">
        {label}
        {infoText && <InfoTooltip infoText={infoText} />}
      </span>
      <Dropdown<Option<V>>
        autoAlign
        id={useId()}
        className="setting-select"
        size="sm"
        titleText={label}
        hideLabel
        label={selected?.label ?? value}
        items={options}
        itemToString={(option) => option?.label ?? ''}
        selectedItem={selected}
        renderSelectedItem={display === undefined ? undefined : () => display}
        onChange={({ selectedItem }) => selectedItem && onChange(selectedItem.value)}
      />
    </div>
  )
}
