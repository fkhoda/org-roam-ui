import { Box } from '@chakra-ui/react'
import { LuInfo } from 'react-icons/lu'
import { Tooltip } from './Tooltip'

/** An info icon that explains a setting on hover. */
export function InfoTooltip({ infoText }: { infoText: string }) {
  return (
    <Tooltip content={infoText} placement="top" showArrow>
      <Box as="span" paddingLeft={1} display="inline-flex" color="fg.subtle" tabIndex={0}>
        <LuInfo size={12} />
      </Box>
    </Tooltip>
  )
}
