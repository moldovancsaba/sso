import { Card, LoadingOverlay, Paper, SimpleGrid, Stack, Table } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import StateBlock from './StateBlock'

export default function ResponsiveDataView({
  columns = null,
  data = null,
  desktop,
  desktopMinWidth = 980,
  emptyDescription,
  emptyTitle,
  error = '',
  getRowKey = null,
  hasItems,
  loading,
  loadingDescription,
  loadingTitle,
  mobile,
  renderCard = null,
  toolbar = null,
}) {
  const isMobile = useMediaQuery('(max-width: 48em)')
  const hasPackageApi =
    Array.isArray(data) &&
    Array.isArray(columns) &&
    typeof renderCard === 'function'

  if (hasPackageApi) {
    return (
      <Stack gap="md">
        {toolbar}
        {error ? (
          <Paper p="md">
            <StateBlock compact variant="error" title="Unable to load data" description={error} />
          </Paper>
        ) : null}

        {!error && !loading && data.length === 0 ? (
          <Paper p="md">
            <StateBlock
              compact
              variant="empty"
              title={emptyTitle || 'No results yet'}
              description={emptyDescription || 'Try changing filters or create a new record.'}
            />
          </Paper>
        ) : null}

        {!error && isMobile && data.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {data.map((item, index) => (
              <Paper key={getRowKey ? getRowKey(item, index) : index} p="md">
                {renderCard(item, index)}
              </Paper>
            ))}
          </SimpleGrid>
        ) : null}

        {!error && !isMobile ? (
          <Paper pos="relative" style={{ overflow: 'hidden' }} withBorder>
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />
            <Table highlightOnHover striped>
              <Table.Thead>
                <Table.Tr>
                  {columns.map((col) => (
                    <Table.Th key={col.key}>{col.label}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.map((item, rowIndex) => (
                  <Table.Tr key={getRowKey ? getRowKey(item, rowIndex) : rowIndex}>
                    {columns.map((col) => (
                      <Table.Td key={col.key}>
                        {col.render ? col.render(item) : item[col.key]}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        ) : null}
      </Stack>
    )
  }

  if (loading) {
    return (
      <Card>
        <StateBlock description={loadingDescription} title={loadingTitle} variant="loading" />
      </Card>
    )
  }

  if (!hasItems) {
    return (
      <Card>
        <StateBlock description={emptyDescription} title={emptyTitle} variant="empty" />
      </Card>
    )
  }

  return (
    <>
      <Stack gap="md" hiddenFrom="md">
        {mobile}
      </Stack>
      <Stack visibleFrom="md">
        {desktop(desktopMinWidth)}
      </Stack>
    </>
  )
}
