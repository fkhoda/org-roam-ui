import { Box, Button, Flex, IconButton } from '@chakra-ui/react'
import { LuHistory, LuSettings, LuX } from 'react-icons/lu'
import {
  initialBehavior,
  initialColoring,
  initialFilter,
  initialLocal,
  initialMouse,
  initialPhysics,
  initialVisuals,
  type Behavior,
  type Coloring,
  type Filter,
  type Local,
  type Mouse,
  type Physics,
  type TagColors,
  type Visuals,
} from '../../config'
import { usePersistentState, type Setter } from '../../hooks/usePersistentState'
import { useTheme } from '../../theme/ThemeProvider'
import { Tooltip } from '../ui/Tooltip'
import { BehaviorPanel } from './BehaviorPanel'
import { FilterPanel } from './FilterPanel'
import { PhysicsPanel } from './PhysicsPanel'
import { SettingsAccordion } from './SettingsAccordion'
import { VisualsPanel } from './VisualsPanel'

export interface TweaksProps {
  physics: Physics
  setPhysics: Setter<Physics>
  threeDim: boolean
  setThreeDim: Setter<boolean>
  filter: Filter
  setFilter: Setter<Filter>
  visuals: Visuals
  setVisuals: Setter<Visuals>
  mouse: Mouse
  setMouse: Setter<Mouse>
  behavior: Behavior
  setBehavior: Setter<Behavior>
  tagColors: TagColors
  setTagColors: Setter<TagColors>
  coloring: Coloring
  setColoring: Setter<Coloring>
  local: Local
  setLocal: Setter<Local>
  tags: string[]
}

/** The settings panel, top left. */
export function Tweaks(props: TweaksProps) {
  const [showTweaks, setShowTweaks] = usePersistentState('showTweaks', false)
  const { setHighlightColor } = useTheme()

  if (!showTweaks) {
    return (
      <Box position="absolute" zIndex="overlay" mt={1}>
        <IconButton variant="subtle" aria-label="Settings" onClick={() => setShowTweaks(true)}>
          <LuSettings />
        </IconButton>
      </Box>
    )
  }

  const reset = () => {
    props.setVisuals(initialVisuals)
    props.setFilter(initialFilter)
    props.setMouse(initialMouse)
    props.setPhysics(initialPhysics)
    props.setBehavior(initialBehavior)
    props.setColoring(initialColoring)
    props.setLocal(initialLocal)
    setHighlightColor('purple.500')
  }

  return (
    <Box
      position="absolute"
      zIndex={10}
      bg="alt.100"
      color="black"
      w="xs"
      mt={2}
      ml={2}
      pb={3}
      borderRadius="lg"
      boxShadow="xl"
      fontSize="sm"
      display="flex"
      flexDirection="column"
      maxH="95vh"
    >
      <Flex justifyContent="space-between" alignItems="center" px={2} pt={1}>
        <Tooltip content={`Switch to the ${props.threeDim ? '2D' : '3D'} view`}>
          <Button onClick={() => props.setThreeDim((on) => !on)} variant="subtle" size="sm">
            {props.threeDim ? '3D' : '2D'}
          </Button>
        </Tooltip>
        <Flex alignItems="center">
          <Tooltip content="Reset settings to defaults">
            <IconButton aria-label="Reset defaults" onClick={reset} variant="subtle" size="sm">
              <LuHistory />
            </IconButton>
          </Tooltip>
          <IconButton
            aria-label="Close settings"
            variant="subtle"
            size="sm"
            onClick={() => setShowTweaks(false)}
          >
            <LuX />
          </IconButton>
        </Flex>
      </Flex>
      <Box overflowY="auto" px={2} className="thin-scrollbar">
        <SettingsAccordion
          big
          sections={[
            {
              title: 'Filter',
              content: (
                <FilterPanel
                  filter={props.filter}
                  setFilter={props.setFilter}
                  local={props.local}
                  setLocal={props.setLocal}
                  tagColors={props.tagColors}
                  setTagColors={props.setTagColors}
                  tags={props.tags}
                />
              ),
            },
            {
              title: 'Physics',
              content: <PhysicsPanel physics={props.physics} setPhysics={props.setPhysics} />,
            },
            {
              title: 'Visual',
              content: (
                <VisualsPanel
                  visuals={props.visuals}
                  setVisuals={props.setVisuals}
                  coloring={props.coloring}
                  setColoring={props.setColoring}
                  threeDim={props.threeDim}
                />
              ),
            },
            {
              title: 'Behavior',
              content: (
                <BehaviorPanel
                  behavior={props.behavior}
                  setBehavior={props.setBehavior}
                  mouse={props.mouse}
                  setMouse={props.setMouse}
                />
              ),
            },
          ]}
        />
      </Box>
    </Box>
  )
}
