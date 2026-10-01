import { Box, Flex, IconButton, NativeSelect, Stack, Text } from '@chakra-ui/react'
import { useContext } from 'react'
import { LuTrash2 } from 'react-icons/lu'
import type { Filter, Local, TagColors } from '../../config'
import { VariablesContext } from '../../context'
import type { Setter } from '../../hooks/usePersistentState'
import { ColorPicker } from '../ui/ColorPicker'
import { SelectMenu } from '../ui/SelectMenu'
import { Switch } from '../ui/Switch'
import { ListSetting, SettingsStack, SliderSetting } from './controls'
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

export function FilterPanel({
  filter,
  setFilter,
  local,
  setLocal,
  tagColors,
  setTagColors,
  tags,
}: FilterPanelProps) {
  const { roamDir, subDirs } = useContext(VariablesContext)
  const set = <K extends keyof Filter>(key: K, value: Filter[K]) =>
    setFilter((current) => ({ ...current, [key]: value }))
  const hide = (key: 'orphans' | 'dailies' | 'noter' | 'filelessCites' | 'bad', label: string) => (
    <Flex justifyContent="space-between">
      <Text>{label}</Text>
      <Switch
        label={label}
        checked={filter[key]}
        onChange={(checked) => {
          // non-existent nodes are colored white when shown
          if (key === 'bad') setTagColors((current) => ({ ...current, bad: 'white' }))
          set(key, checked)
        }}
      />
    </Flex>
  )
  const withoutRoamDir = (dir: string) => (roamDir ? dir.replace(roamDir, '') : dir)

  return (
    <Box>
      <SettingsStack pl={7}>
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
        <Text fontSize="xs" color="fg.subtle">
          Hide
        </Text>
        {hide('orphans', 'Orphans')}
        {hide('dailies', 'Dailies')}
        {hide('noter', 'Org-noter pages')}
        {hide('filelessCites', 'Citations without note files')}
        {hide('bad', 'Non-existent nodes')}
        <SliderSetting
          label="Number of neighbors in local graph"
          value={local.neighbors}
          onChange={(neighbors) => setLocal((current) => ({ ...current, neighbors }))}
          min={1}
          max={5}
          step={1}
        />
      </SettingsStack>
      <SettingsAccordion
        pl={3}
        sections={[
          {
            title: 'Directory filters',
            content: (
              <>
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
              </>
            ),
          },
          {
            title: 'Tag filters',
            content: (
              <>
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
              </>
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
    </Box>
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
    <Stack gap={2} color="fg.muted">
      <NativeSelect.Root size="xs" disabled={!uncolored.length}>
        <NativeSelect.Field
          aria-label="Add tag to color"
          value=""
          onChange={(event) => {
            const tag = event.target.value
            if (tag) setTagColors((current) => ({ ...current, [tag]: 'gray.600' }))
          }}
        >
          <option value="">
            {uncolored.length ? 'Add tag to color…' : 'All tags have colors'}
          </option>
          {uncolored.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      {Object.keys(tagColors).map((tag) => (
        <Flex key={tag} alignItems="center" gap={1} pl={2}>
          <Text flex={1} truncate>
            {tag}
          </Text>
          <ColorPicker
            value={tagColors[tag]}
            allowEmpty={false}
            onChange={(color) => setTagColors((current) => ({ ...current, [tag]: color }))}
          />
          <IconButton
            aria-label={`Remove color of ${tag}`}
            variant="ghost"
            size="sm"
            onClick={() =>
              setTagColors((current) =>
                Object.fromEntries(Object.entries(current).filter(([t]) => t !== tag)),
              )
            }
          >
            <LuTrash2 />
          </IconButton>
        </Flex>
      ))}
    </Stack>
  )
}
