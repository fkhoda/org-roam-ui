import { TrashCan } from '@carbon/icons-react'
import { IconButton, Select, SelectItem } from '@carbon/react'
import { useContext, useId } from 'react'
import type { Filter, Local, TagColors } from '../../config'
import { VariablesContext } from '../../context'
import type { Setter } from '../../hooks/usePersistentState'
import { ColorPicker } from '../ui/ColorPicker'
import { SelectMenu } from '../ui/SelectMenu'
import { ListSetting, SettingsStack, SliderSetting, ToggleSetting } from './controls'
import { SettingsAccordion } from './SettingsAccordion'

export interface FilterPanelProps {
  filter: Filter
  setFilter: Setter<Filter>
  local: Local
  setLocal: Setter<Local>
  tagColors: TagColors
  setTagColors: Setter<TagColors>
  tags: string[]
}

type Hideable = 'orphans' | 'dailies' | 'noter' | 'filelessCites' | 'bad'

export function FilterPanel(props: FilterPanelProps) {
  const { filter, setFilter, local, setLocal, tagColors, setTagColors, tags } = props
  const { roamDir, subDirs } = useContext(VariablesContext)
  const set = <K extends keyof Filter>(key: K, value: Filter[K]) =>
    setFilter((current) => ({ ...current, [key]: value }))
  const hide = (key: Hideable, label: string) => (
    <ToggleSetting
      label={label}
      value={filter[key]}
      onChange={(checked) => {
        // non-existent nodes are colored white when shown
        if (key === 'bad') setTagColors((current) => ({ ...current, bad: 'white' }))
        set(key, checked)
      }}
    />
  )
  const withoutRoamDir = (dir: string) => (roamDir ? dir.replace(roamDir, '') : dir)

  return (
    <SettingsStack>
      <SelectMenu
        label="Link children to"
        value={filter.parent}
        onChange={(value) => set('parent', value)}
        options={[
          { value: '', label: 'Nothing' },
          { value: 'parent', label: 'Parent file node' },
          { value: 'heading', label: 'Next highest heading node' },
        ]}
        display={{ parent: 'File', heading: 'Heading' }[filter.parent] ?? 'Nothing'}
      />
      <p className="setting-heading">Hide</p>
      {hide('orphans', 'Orphans')}
      {hide('dailies', 'Dailies')}
      {hide('noter', 'Org-noter pages')}
      {hide('filelessCites', 'Citations without note files')}
      {hide('bad', 'Non-existent nodes')}
      <SliderSetting
        label="Neighbors in local graph"
        value={local.neighbors}
        onChange={(neighbors) => setLocal((current) => ({ ...current, neighbors }))}
        min={1}
        max={5}
        step={1}
      />
      <SettingsAccordion
        sections={[
          {
            title: 'Directory filters',
            content: (
              <SettingsStack>
                <ListSetting
                  label="Directory blocklist"
                  options={subDirs}
                  value={filter.dirsBlocklist}
                  onChange={(dirs) => set('dirsBlocklist', dirs)}
                  format={withoutRoamDir}
                />
                <ListSetting
                  label="Directory allowlist"
                  options={subDirs}
                  value={filter.dirsAllowlist}
                  onChange={(dirs) => set('dirsAllowlist', dirs)}
                  format={withoutRoamDir}
                />
              </SettingsStack>
            ),
          },
          {
            title: 'Tag filters',
            content: (
              <SettingsStack>
                <ListSetting
                  label="Tag blocklist"
                  options={tags}
                  value={filter.tagsBlacklist}
                  onChange={(list) => set('tagsBlacklist', list)}
                />
                <ListSetting
                  label="Tag allowlist"
                  options={tags}
                  value={filter.tagsWhitelist}
                  onChange={(list) => set('tagsWhitelist', list)}
                />
              </SettingsStack>
            ),
          },
          {
            title: 'Tag colors',
            content: (
              <TagColorPanel tags={tags} tagColors={tagColors} setTagColors={setTagColors} />
            ),
          },
        ]}
      />
    </SettingsStack>
  )
}

function TagColorPanel({
  tags,
  tagColors,
  setTagColors,
}: {
  tags: string[]
  tagColors: TagColors
  setTagColors: Setter<TagColors>
}) {
  const uncolored = tags.filter((tag) => !tagColors[tag])
  return (
    <SettingsStack>
      <Select
        id={useId()}
        size="sm"
        labelText="Add tag to color"
        value=""
        disabled={!uncolored.length}
        onChange={(event) => {
          const tag = event.target.value
          if (tag) setTagColors((current) => ({ ...current, [tag]: 'gray.600' }))
        }}
      >
        <SelectItem value="" text={uncolored.length ? 'Pick a tag…' : 'All tags have colors'} />
        {uncolored.map((tag) => (
          <SelectItem key={tag} value={tag} text={tag} />
        ))}
      </Select>
      {Object.keys(tagColors).map((tag) => (
        <div key={tag} className="setting-row">
          <span>{tag}</span>
          <span className="setting-row__label">
            <ColorPicker
              value={tagColors[tag]}
              allowEmpty={false}
              onChange={(color) => setTagColors((current) => ({ ...current, [tag]: color }))}
            />
            <IconButton
              label={`Remove color of ${tag}`}
              kind="ghost"
              size="sm"
              onClick={() =>
                setTagColors((current) =>
                  Object.fromEntries(Object.entries(current).filter(([t]) => t !== tag)),
                )
              }
            >
              <TrashCan />
            </IconButton>
          </span>
        </div>
      ))}
    </SettingsStack>
  )
}
