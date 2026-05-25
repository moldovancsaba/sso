import { Badge, Card, Grid, Group, Stack, Text, Title } from '@mantine/core'

export default function AdminDataToolbar({
  activeFilters = [],
  children,
  count = null,
  createAction = null,
  description = null,
  filterSlot = null,
  resetAction = null,
  searchSlot = null,
  sortSlot = null,
  title = null,
}) {
  return (
    <Card>
      <Stack gap="md">
        {title || description || count !== null ? (
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              {title ? <Title order={2}>{title}</Title> : null}
              {description ? (
                <Text c="dimmed" size="sm">
                  {description}
                </Text>
              ) : null}
            </Stack>
            {count !== null ? <Badge variant="light">{count}</Badge> : null}
          </Group>
        ) : null}
        {searchSlot || filterSlot || sortSlot || resetAction || createAction ? (
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" gap="sm">
              <Group flex={1} align="flex-start" gap="sm">
                {searchSlot}
                {filterSlot}
                {sortSlot}
              </Group>
              <Group gap="sm">
                {resetAction}
                {createAction}
              </Group>
            </Group>
            {activeFilters.length ? (
              <Group gap="xs">
                {activeFilters.map((filter) => (
                  <Badge
                    key={filter.label}
                    onClick={filter.onRemove}
                    rightSection={filter.onRemove ? '×' : undefined}
                    style={filter.onRemove ? { cursor: 'pointer' } : undefined}
                    variant="light"
                  >
                    {filter.label}
                  </Badge>
                ))}
              </Group>
            ) : null}
          </Stack>
        ) : null}
        {children ? <Grid>{children}</Grid> : null}
      </Stack>
    </Card>
  )
}
