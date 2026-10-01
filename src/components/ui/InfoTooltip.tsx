import { Information } from '@carbon/icons-react'
import { Tooltip } from './Tooltip'

/** An info icon that explains a setting on hover. */
export function InfoTooltip({ infoText }: { infoText: string }) {
  return (
    <Tooltip content={infoText} placement="top">
      <button type="button" className="info-button" aria-label={infoText}>
        <Information size={12} />
      </button>
    </Tooltip>
  )
}
