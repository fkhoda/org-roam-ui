import type { Physics } from '../../config'
import type { Setter } from '../../hooks/usePersistentState'
import { SettingsStack, SliderSetting, ToggleSetting } from './controls'
import { SettingsAccordion } from './SettingsAccordion'

export function PhysicsPanel({
  physics,
  setPhysics,
}: {
  physics: Physics
  setPhysics: Setter<Physics>
}) {
  const set = <K extends keyof Physics>(key: K, value: Physics[K]) =>
    setPhysics((current) => ({ ...current, [key]: value }))
  // the sliders show friendlier numbers than the forces use: shown = value * scale
  const slider = (key: keyof Physics, scale: number) => ({
    value: (physics[key] as number) * scale,
    onChange: (shown: number) => set(key, shown / scale),
  })

  return (
    <div>
      <SettingsStack>
        <ToggleSetting
          label="Gravity"
          value={physics.gravityOn}
          onChange={(on) => set('gravityOn', on)}
        >
          <ToggleSetting
            label="Also in local graph"
            value={physics.gravityLocal}
            onChange={(on) => set('gravityLocal', on)}
          />
          <SliderSetting label="Strength" {...slider('gravity', 10)} />
        </ToggleSetting>
        <SliderSetting label="Repulsive force" {...slider('charge', -1 / 100)} />
        <SliderSetting label="Link force" {...slider('linkStrength', 5)} />
        <SliderSetting label="Stabilization rate" {...slider('alphaDecay', 50)} />
      </SettingsStack>
      <SettingsAccordion
        sections={[
          {
            title: 'Advanced',
            content: (
              <SettingsStack>
                <ToggleSetting
                  label="Collision"
                  infoText="Costs performance: turn it off if the graph is slow"
                  value={physics.collision}
                  onChange={(on) => set('collision', on)}
                >
                  <SliderSetting
                    label="Collision radius"
                    infoText="High values can make the graph jiggle"
                    {...slider('collisionStrength', 1 / 5)}
                  />
                </ToggleSetting>
                <SliderSetting
                  label="Link iterations"
                  infoText="How many links down the line one node's physics reaches (slow)"
                  min={0}
                  max={6}
                  step={1}
                  {...slider('linkIts', 1)}
                />
                <SliderSetting label="Viscosity" {...slider('velocityDecay', 10)} />
                <ToggleSetting
                  label="Center nodes"
                  infoText="Keeps the nodes in the middle of the view. Turn it off to drag nodes anywhere."
                  value={physics.centering}
                  onChange={(on) => set('centering', on)}
                >
                  <SliderSetting
                    label="Centering strength"
                    max={2}
                    step={0.01}
                    {...slider('centeringStrength', 1)}
                  />
                </ToggleSetting>
              </SettingsStack>
            ),
          },
        ]}
      />
    </div>
  )
}
