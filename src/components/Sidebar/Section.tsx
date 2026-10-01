import { ChevronDown, ChevronUp, CircleFilled, RadioButton } from '@carbon/icons-react'
import { Children, useContext, useState, type ReactNode } from 'react'
import { NoteContext } from '../../context'

/**
 * A heading and its contents, collapsible. Both a chevron (viewer style) and a bullet (outline
 * style) are rendered; the note style shows one of them.
 */
export function Section({ children, className }: { children: ReactNode; className?: string }) {
  const { collapse } = useContext(NoteContext)
  // the toolbar's "collapse all" resets every section
  const [state, setState] = useState({ open: !collapse, collapse })
  if (state.collapse !== collapse) setState({ open: !collapse, collapse })
  const open = state.open
  const toggle = () => setState((s) => ({ ...s, open: !s.open }))

  const [heading, ...content] = Children.toArray(children)
  const label = open ? 'Collapse heading' : 'Expand heading'
  return (
    <section className={`sec ${className ?? ''}`}>
      <div className="headingFlex">
        <button
          type="button"
          className="heading-toggle viewerHeadingButton"
          aria-label={label}
          aria-expanded={open}
          onClick={toggle}
        >
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button
          type="button"
          className="heading-toggle outlineHeadingButton"
          aria-label={label}
          aria-expanded={open}
          onClick={toggle}
        >
          {open ? <RadioButton size={12} /> : <CircleFilled size={12} />}
        </button>
        {heading}
      </div>
      {open && <div className="sectionContent">{content}</div>}
    </section>
  )
}
