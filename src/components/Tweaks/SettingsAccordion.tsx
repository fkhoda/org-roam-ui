import { Accordion, AccordionItem } from '@carbon/react'
import type { ReactNode } from 'react'

export interface SettingsAccordionProps {
  sections: { title: ReactNode; content: ReactNode }[]
  /** indexes of the sections open at first */
  defaultOpen?: number[]
  /** the top level: larger titles */
  big?: boolean
}

/** Collapsible groups of settings; any number can be open. */
export function SettingsAccordion({ sections, defaultOpen = [], big }: SettingsAccordionProps) {
  return (
    <Accordion size={big ? 'lg' : 'sm'} align="start">
      {sections.map(({ title, content }, index) => (
        <AccordionItem key={index} title={title} open={defaultOpen.includes(index) || undefined}>
          {content}
        </AccordionItem>
      ))}
    </Accordion>
  )
}
