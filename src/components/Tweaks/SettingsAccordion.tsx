import { Accordion, type AccordionRootProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface SettingsAccordionProps extends Omit<AccordionRootProps, 'children'> {
  sections: { title: ReactNode; content: ReactNode }[]
  /** heading-sized titles, for the top level */
  big?: boolean
}

/** Collapsible groups of settings; any number can be open. */
export function SettingsAccordion({ sections, big, ...rest }: SettingsAccordionProps) {
  return (
    <Accordion.Root multiple collapsible lazyMount variant="plain" {...rest}>
      {sections.map(({ title }, index) => (
        <Accordion.Item key={index} value={String(index)}>
          <Accordion.ItemTrigger
            py={2}
            fontWeight={big ? 'semibold' : 'normal'}
            fontSize={big ? 'md' : 'sm'}
            cursor="pointer"
          >
            <Accordion.ItemIndicator />
            {title}
          </Accordion.ItemTrigger>
          <Accordion.ItemContent>
            <Accordion.ItemBody pt={1} pr={2}>
              {sections[index].content}
            </Accordion.ItemBody>
          </Accordion.ItemContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
