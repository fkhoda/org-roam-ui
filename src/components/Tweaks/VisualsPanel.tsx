import { ArrowRight, Shuffle } from '@carbon/icons-react'
import { Dropdown, IconButton, Select, SelectItem } from '@carbon/react'
import { useId } from 'react'
import { algos, colorList, type Coloring, type Visuals } from '../../config'
import { useEditorName } from '../../context'
import type { Setter } from '../../hooks/usePersistentState'
import { themes } from '../../theme/themes'
import { useTheme } from '../../theme/ThemeProvider'
import { ColorPicker, PopoverButton, SchemeSwatch, SwatchGrid } from '../ui/ColorPicker'
import { SelectMenu } from '../ui/SelectMenu'
import { SettingsStack, SliderSetting, ToggleSetting } from './controls'
import { SettingsAccordion } from './SettingsAccordion'

export interface VisualsPanelProps {
  visuals: Visuals
  setVisuals: Setter<Visuals>
  coloring: Coloring
  setColoring: Setter<Coloring>
  threeDim: boolean
}

type SetVisual = <K extends keyof Visuals>(key: K) => (value: Visuals[K]) => void

export function VisualsPanel(props: VisualsPanelProps) {
  const { visuals, setVisuals, coloring, setColoring, threeDim } = props
  const set: SetVisual = (key) => (value) => setVisuals((current) => ({ ...current, [key]: value }))
  return (
    <SettingsStack>
      <ThemeSelect />
      <SelectMenu
        label="Graph coloring"
        value={coloring.method}
        options={[
          { value: 'degree', label: 'Number of links' },
          { value: 'community', label: 'Communities' },
        ]}
        display={coloring.method === 'degree' ? 'Links' : 'Communities'}
        onChange={(method) => setColoring((current) => ({ ...current, method }))}
      />
      <SettingsAccordion
        defaultOpen={[0]}
        sections={[
          {
            title: 'Colors',
            content: <ColorsPanel visuals={visuals} setVisuals={setVisuals} set={set} />,
          },
          {
            title: 'Nodes & links',
            content: <NodesLinksPanel visuals={visuals} set={set} threeDim={threeDim} />,
          },
          { title: 'Labels', content: <LabelsPanel visuals={visuals} set={set} /> },
          { title: 'Highlighting', content: <HighlightingPanel visuals={visuals} set={set} /> },
          { title: 'Citations', content: <CitationsPanel visuals={visuals} set={set} /> },
        ]}
      />
    </SettingsStack>
  )
}

function ThemeSelect() {
  const { theme, setTheme } = useTheme()
  const names = Object.keys(themes)
  return (
    <div className="setting-row">
      <span>Theme</span>
      <Dropdown<string>
        id={useId()}
        className="setting-select"
        size="sm"
        titleText="Theme"
        hideLabel
        label={theme[0]}
        items={names}
        selectedItem={names.includes(theme[0]) ? theme[0] : undefined}
        itemToString={(name) => name ?? ''}
        itemToElement={(name) => (
          <span className="theme-option">
            {name}
            <span className="swatch swatch--scheme" style={{ width: 64 }}>
              {Object.values(themes[name]).map((color, i) => (
                <span key={i} style={{ background: color }} />
              ))}
            </span>
          </span>
        )}
        onChange={({ selectedItem }) =>
          selectedItem && setTheme([selectedItem, themes[selectedItem]])
        }
      />
    </div>
  )
}

function ColorsPanel({
  visuals,
  setVisuals,
  set,
}: {
  visuals: Visuals
  setVisuals: Setter<Visuals>
  set: SetVisual
}) {
  const { highlightColor, setHighlightColor } = useTheme()
  const editor = useEditorName()
  const scheme = visuals.nodeColorScheme
  return (
    <SettingsStack>
      <div className="setting-row">
        <span>Nodes</span>
        <span className="setting-row__label">
          <IconButton
            label="Shuffle node colors"
            kind="ghost"
            size="sm"
            onClick={() =>
              setVisuals((current) => ({
                ...current,
                nodeColorScheme: current.nodeColorScheme
                  .map((color) => [Math.random(), color] as const)
                  .sort(([a], [b]) => a - b)
                  .map(([, color]) => color),
              }))
            }
          >
            <Shuffle />
          </IconButton>
          <IconButton
            label="Cycle node colors"
            kind="ghost"
            size="sm"
            onClick={() =>
              setVisuals((current) => ({
                ...current,
                nodeColorScheme: [...current.nodeColorScheme.slice(1), current.nodeColorScheme[0]],
              }))
            }
          >
            <ArrowRight />
          </IconButton>
          <PopoverButton label="Node colors" display={<SchemeSwatch colors={scheme} />}>
            {() => (
              <SwatchGrid
                colors={colorList}
                isSelected={(color) => scheme.includes(color)}
                onPick={(color) =>
                  // toggle the color; the scheme keeps at least one
                  set('nodeColorScheme')(
                    !scheme.includes(color)
                      ? [...scheme, color]
                      : scheme.length > 1
                        ? scheme.filter((c) => c !== color)
                        : scheme,
                  )
                }
              />
            )}
          </PopoverButton>
        </span>
      </div>
      <ColorPicker
        label="Links"
        value={visuals.linkColorScheme}
        onChange={set('linkColorScheme')}
        allowEmpty={false}
        extra={{ label: 'Same as nodes', value: '', display: <SchemeSwatch colors={scheme} /> }}
        display={visuals.linkColorScheme ? undefined : <SchemeSwatch colors={scheme} />}
      />
      <ColorPicker
        label="Accent"
        value={highlightColor}
        onChange={setHighlightColor}
        allowEmpty={false}
      />
      <ColorPicker
        label="Link highlight"
        value={visuals.linkHighlight}
        onChange={set('linkHighlight')}
      />
      <ColorPicker
        label="Node highlight"
        value={visuals.nodeHighlight}
        onChange={set('nodeHighlight')}
      />
      <ColorPicker
        label="Background"
        value={visuals.backgroundColor}
        onChange={set('backgroundColor')}
      />
      <ColorPicker
        label={`${editor} node`}
        value={visuals.emacsNodeColor}
        onChange={set('emacsNodeColor')}
      />
    </SettingsStack>
  )
}

function NodesLinksPanel({
  visuals,
  set,
  threeDim,
}: {
  visuals: Visuals
  set: SetVisual
  threeDim: boolean
}) {
  return (
    <SettingsStack>
      <SliderSetting label="Node size" value={visuals.nodeRel} onChange={set('nodeRel')} />
      <SliderSetting
        label="Node degree size multiplier"
        value={visuals.nodeSizeLinks}
        min={0}
        max={2}
        onChange={set('nodeSizeLinks')}
      />
      <SliderSetting
        label="Node zoom invariance"
        infoText="How much nodes keep their size on screen as you zoom: 0 not at all (their true size), 1 linearly, 2 quadratically"
        value={visuals.nodeZoomSize}
        min={0}
        max={2}
        onChange={set('nodeZoomSize')}
      />
      {threeDim && (
        <>
          <SliderSetting
            label="Node opacity"
            value={visuals.nodeOpacity}
            min={0}
            max={1}
            onChange={set('nodeOpacity')}
          />
          <SliderSetting
            label="Node resolution"
            value={visuals.nodeResolution}
            min={5}
            max={32}
            step={1}
            onChange={set('nodeResolution')}
          />
        </>
      )}
      <SliderSetting label="Link width" value={visuals.linkWidth} onChange={set('linkWidth')} />
      {threeDim && (
        <SliderSetting
          label="Link opacity"
          value={visuals.linkOpacity}
          min={0}
          max={1}
          onChange={set('linkOpacity')}
        />
      )}
      <ToggleSetting label="Link arrows" value={visuals.arrows} onChange={set('arrows')}>
        <SliderSetting
          label="Arrow size"
          value={visuals.arrowsLength / 10}
          onChange={(v) => set('arrowsLength')(10 * v)}
        />
        <SliderSetting
          label="Arrow position"
          value={visuals.arrowsPos}
          min={0}
          max={1}
          step={0.01}
          onChange={set('arrowsPos')}
        />
        <ColorPicker
          label="Arrow color"
          value={visuals.arrowsColor}
          onChange={set('arrowsColor')}
        />
      </ToggleSetting>
      <ToggleSetting
        label="Directional particles"
        value={visuals.particles}
        onChange={set('particles')}
      >
        <SliderSetting
          label="Particle number"
          value={visuals.particlesNumber}
          max={5}
          step={1}
          onChange={set('particlesNumber')}
        />
        <SliderSetting
          label="Particle size"
          value={visuals.particlesWidth}
          onChange={set('particlesWidth')}
        />
      </ToggleSetting>
    </SettingsStack>
  )
}

function LabelsPanel({ visuals, set }: { visuals: Visuals; set: SetVisual }) {
  return (
    <SettingsStack>
      <SelectMenu
        label="Show labels"
        value={String(visuals.labels)}
        options={[
          { value: '0', label: 'Never' },
          { value: '1', label: 'On highlight' },
          { value: '2', label: 'Always' },
          { value: '3', label: 'Always (even in 3D)' },
        ]}
        onChange={(value) => set('labels')(Number(value))}
      />
      {visuals.labels > 1 && (
        <>
          <SliderSetting
            label="Label appearance scale"
            value={visuals.labelScale * 2}
            onChange={(v) => set('labelScale')(v / 2)}
          />
          <SliderSetting
            label="Label dynamicity"
            infoText="Labels of nodes with more links appear sooner as you zoom in. This sets how much; 0 turns it off."
            value={visuals.labelDynamicStrength}
            min={0}
            max={1}
            step={0.05}
            onChange={set('labelDynamicStrength')}
          />
          {visuals.labelDynamicStrength > 0 && (
            <SliderSetting
              label="Dynamic zoom degree cap"
              infoText="Nodes with more links than this count as having this many for the effect above"
              value={visuals.labelDynamicDegree}
              min={1}
              max={15}
              step={1}
              onChange={set('labelDynamicDegree')}
            />
          )}
        </>
      )}
      <ColorPicker label="Text" value={visuals.labelTextColor} onChange={set('labelTextColor')} />
      <ColorPicker
        label="Background"
        value={visuals.labelBackgroundColor}
        onChange={set('labelBackgroundColor')}
      />
      {visuals.labelBackgroundColor && (
        <SliderSetting
          label="Background opacity"
          value={visuals.labelBackgroundOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={set('labelBackgroundOpacity')}
        />
      )}
      <SliderSetting
        label="Label font size"
        value={visuals.labelFontSize}
        min={5}
        max={20}
        step={0.5}
        onChange={set('labelFontSize')}
      />
      <SliderSetting
        label="Max. label characters"
        value={visuals.labelLength}
        min={10}
        max={100}
        step={1}
        onChange={set('labelLength')}
      />
      <SliderSetting
        label="Max. label line length"
        value={visuals.labelWordWrap}
        min={10}
        max={100}
        step={1}
        onChange={set('labelWordWrap')}
      />
      <SliderSetting
        label="Space between label lines"
        value={visuals.labelLineSpace}
        min={0.2}
        max={3}
        step={0.1}
        onChange={set('labelLineSpace')}
      />
    </SettingsStack>
  )
}

function HighlightingPanel({ visuals, set }: { visuals: Visuals; set: SetVisual }) {
  const easingId = useId()
  return (
    <ToggleSetting label="Highlight" value={visuals.highlight} onChange={set('highlight')}>
      <SettingsStack>
        <SliderSetting
          label="Highlight link thickness"
          value={visuals.highlightLinkSize}
          onChange={set('highlightLinkSize')}
        />
        <SliderSetting
          label="Highlight node size"
          value={visuals.highlightNodeSize}
          onChange={set('highlightNodeSize')}
        />
        <SliderSetting
          label="Highlight fade"
          value={visuals.highlightFade}
          min={0}
          max={1}
          onChange={set('highlightFade')}
        />
        <ToggleSetting
          label="Highlight animation"
          value={visuals.highlightAnim}
          onChange={set('highlightAnim')}
        >
          <SliderSetting
            label="Animation speed"
            infoText="Slow animations can glitch"
            value={visuals.animationSpeed}
            min={50}
            max={1000}
            step={10}
            onChange={set('animationSpeed')}
          />
          <Select
            id={easingId}
            size="sm"
            labelText="Easing"
            value={visuals.algorithmName}
            onChange={(event) => set('algorithmName')(event.target.value)}
          >
            {Object.keys(algos).map((name) => (
              <SelectItem key={name} value={name} text={name} />
            ))}
          </Select>
        </ToggleSetting>
      </SettingsStack>
    </ToggleSetting>
  )
}

function CitationsPanel({ visuals, set }: { visuals: Visuals; set: SetVisual }) {
  return (
    <SettingsStack>
      <ToggleSetting
        label="Dash cite links"
        infoText="Dash citation links made with org-roam-bibtex"
        value={visuals.citeDashes}
        onChange={set('citeDashes')}
      >
        <SliderSetting
          label="Dash length"
          value={visuals.citeDashLength / 10}
          onChange={(v) => set('citeDashLength')(v * 10)}
        />
        <SliderSetting
          label="Gap length"
          value={visuals.citeGapLength / 5}
          onChange={(v) => set('citeGapLength')(v * 5)}
        />
      </ToggleSetting>
      <ColorPicker
        label="Citation node color"
        value={visuals.citeNodeColor}
        onChange={set('citeNodeColor')}
      />
      <ColorPicker
        label="Citation link color"
        value={visuals.citeLinkColor}
        onChange={set('citeLinkColor')}
      />
      <ColorPicker
        label="Citation link highlight"
        value={visuals.citeLinkHighlightColor}
        onChange={set('citeLinkHighlightColor')}
      />
      <ToggleSetting
        label="Dash ref links"
        infoText="Dash citation links to notes, made with org-roam-bibtex"
        value={visuals.refDashes}
        onChange={set('refDashes')}
      >
        <SliderSetting
          label="Dash length"
          value={visuals.refDashLength / 10}
          onChange={(v) => set('refDashLength')(v * 10)}
        />
        <SliderSetting
          label="Gap length"
          value={visuals.refGapLength / 5}
          onChange={(v) => set('refGapLength')(v * 5)}
        />
      </ToggleSetting>
      <ColorPicker
        label="Reference node color"
        value={visuals.refNodeColor}
        onChange={set('refNodeColor')}
      />
      <ColorPicker
        label="Reference link color"
        value={visuals.refLinkColor}
        onChange={set('refLinkColor')}
      />
      <ColorPicker
        label="Reference link highlight"
        value={visuals.refLinkHighlightColor}
        onChange={set('refLinkHighlightColor')}
      />
    </SettingsStack>
  )
}
