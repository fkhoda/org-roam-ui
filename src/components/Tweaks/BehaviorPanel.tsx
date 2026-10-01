import type { Behavior, Mouse } from '../../config'
import { useEditorName } from '../../context'
import type { Setter } from '../../hooks/usePersistentState'
import { SelectMenu } from '../ui/SelectMenu'
import { SettingsStack, SliderSetting } from './controls'

const clicks = (...kinds: ('click' | 'double' | 'right')[]) => [
  { value: '', label: 'Never' },
  ...kinds.map((kind) => ({
    value: kind,
    label: { click: 'Click', double: 'Double click', right: 'Right click' }[kind],
  })),
]

export interface BehaviorPanelProps {
  behavior: Behavior
  setBehavior: Setter<Behavior>
  mouse: Mouse
  setMouse: Setter<Mouse>
}

export function BehaviorPanel({ behavior, setBehavior, mouse, setMouse }: BehaviorPanelProps) {
  const editor = useEditorName()
  const setMouseKey = (key: keyof Mouse) => (value: string) =>
    setMouse((current) => ({ ...current, [key]: value }))
  const setBehaviorKey = (key: keyof Behavior) => (value: string | number) =>
    setBehavior((current) => ({ ...current, [key]: value }))

  return (
    <SettingsStack>
      <SelectMenu
        label="Preview node"
        value={mouse.preview}
        options={clicks('click', 'double')}
        onChange={setMouseKey('preview')}
      />
      <SelectMenu
        label="Expand node"
        infoText="Show only the node and its direct neighbors"
        value={mouse.local}
        options={clicks('click', 'double', 'right')}
        onChange={setMouseKey('local')}
      />
      <SelectMenu
        label={`Open in ${editor}`}
        value={mouse.follow}
        options={clicks('click', 'double', 'right')}
        onChange={setMouseKey('follow')}
      />
      <SelectMenu
        label={`Follow ${editor} by`}
        value={behavior.follow}
        options={[
          { value: 'color', label: 'Coloring the current node' },
          { value: 'local', label: 'Opening its local graph' },
          { value: 'zoom', label: 'Zooming to it' },
        ]}
        display={{ color: 'Color', local: 'Local', zoom: 'Zoom' }[behavior.follow]}
        onChange={setBehaviorKey('follow')}
      />
      <SelectMenu
        label="Local graph"
        infoText="In the local graph, clicking another node adds its neighbors to the graph, or replaces the graph with its own"
        value={behavior.localSame}
        options={[
          { value: 'add', label: 'Add the node to the local graph' },
          { value: 'replace', label: "Open the node's local graph" },
        ]}
        display={behavior.localSame === 'add' ? 'Add' : 'Replace'}
        onChange={setBehaviorKey('localSame')}
      />
      <SliderSetting
        label="Zoom speed"
        value={behavior.zoomSpeed}
        min={0}
        max={4000}
        step={100}
        onChange={setBehaviorKey('zoomSpeed')}
      />
      <SliderSetting
        label="Zoom padding"
        infoText="How far to zoom out to fit all the nodes when the view changes"
        value={behavior.zoomPadding}
        min={0}
        max={400}
        step={1}
        onChange={setBehaviorKey('zoomPadding')}
      />
    </SettingsStack>
  )
}
