import { Close, Reset, Settings } from '@carbon/icons-react'
import { Button, IconButton } from '@carbon/react'
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
      <div className="tweaks-button">
        <IconButton
          autoAlign
          label="Settings"
          kind="ghost"
          align="right"
          onClick={() => setShowTweaks(true)}
        >
          <Settings />
        </IconButton>
      </div>
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
    <aside className="tweaks" aria-label="Settings">
      <div className="tweaks__header">
        <Button kind="ghost" size="sm" onClick={() => props.setThreeDim((on) => !on)}>
          {props.threeDim ? '3D' : '2D'}
        </Button>
        <span>
          <IconButton
            autoAlign
            label="Reset settings to defaults"
            kind="ghost"
            size="sm"
            align="bottom"
            onClick={reset}
          >
            <Reset />
          </IconButton>
          <IconButton
            autoAlign
            label="Close settings"
            kind="ghost"
            size="sm"
            onClick={() => setShowTweaks(false)}
          >
            <Close />
          </IconButton>
        </span>
      </div>
      <div className="tweaks__body thin-scrollbar">
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
      </div>
    </aside>
  )
}
