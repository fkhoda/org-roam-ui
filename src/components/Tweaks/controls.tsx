import {
  Box,
  Collapsible,
  Flex,
  NativeSelect,
  Slider,
  Stack,
  StackSeparator,
  Tag,
  Text,
  Wrap,
  type StackProps,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { InfoTooltip } from '../ui/InfoTooltip'
import { Switch } from '../ui/Switch'

/** A column of settings with dividers between them. */
export function SettingsStack(props: StackProps) {
  return (
    <Stack
      gap={2}
      separator={<StackSeparator borderColor="gray.400" />}
      color="fg.muted"
      {...props}
    />
  )
}

function Label({ label, infoText }: { label: ReactNode; infoText?: string }) {
  return (
    <Flex alignItems="center">
      <Text>{label}</Text>
      {infoText && <InfoTooltip infoText={infoText} />}
    </Flex>
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
  return (
    <Box pt={1} pb={2}>
      <Flex justifyContent="space-between" mb={2}>
        <Label label={label} infoText={infoText} />
        <Text color="fg.subtle" fontVariantNumeric="tabular-nums">
          {Number.isInteger(step) ? value : value.toFixed(step < 0.1 ? 2 : 1)}
        </Text>
      </Flex>
      <Slider.Root
        size="sm"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(details) => onChange(details.value[0])}
        aria-label={[label]}
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          <Slider.Thumbs />
        </Slider.Control>
      </Slider.Root>
    </Box>
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
    <Box pt={1}>
      <Flex justifyContent="space-between" alignItems="center" pb={1}>
        <Label label={label} infoText={infoText} />
        <Switch checked={value} onChange={onChange} label={label} />
      </Flex>
      {children && (
        <Collapsible.Root open={value} lazyMount>
          <Collapsible.Content>
            <Box pl={4} py={2}>
              {children}
            </Box>
          </Collapsible.Content>
        </Collapsible.Root>
      )}
    </Box>
  )
}

export interface ListSettingProps {
  label: string
  /** what can be added */
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  /** shown instead of each item, e.g. without the roam directory */
  format?: (item: string) => string
}

/** A list of items (tags, directories) to add to and remove from. */
export function ListSetting({
  label,
  options,
  value,
  onChange,
  format = (x) => x,
}: ListSettingProps) {
  const addable = options.filter((option) => !value.includes(option))
  return (
    <Box pb={3}>
      <Text fontSize="xs" mb={1}>
        {label}
      </Text>
      {value.length > 0 && (
        <Wrap gap={1} mb={2}>
          {value.map((item) => (
            <Tag.Root key={item} size="sm" variant="outline" colorPalette="accent">
              <Tag.Label>{format(item)}</Tag.Label>
              <Tag.EndElement>
                <Tag.CloseTrigger
                  aria-label={`Remove ${format(item)}`}
                  onClick={() => onChange(value.filter((v) => v !== item))}
                />
              </Tag.EndElement>
            </Tag.Root>
          ))}
        </Wrap>
      )}
      <NativeSelect.Root size="xs" disabled={!addable.length}>
        <NativeSelect.Field
          aria-label={label}
          value=""
          onChange={(event) => event.target.value && onChange([...value, event.target.value])}
        >
          <option value="">{addable.length ? 'Add…' : 'Nothing to add'}</option>
          {addable.map((option) => (
            <option key={option} value={option}>
              {format(option)}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Box>
  )
}
