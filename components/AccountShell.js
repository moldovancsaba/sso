import Link from 'next/link'
import {
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'

export default function AccountShell({ actions = null, children, description, title }) {
  return (
    <Container py="xl" size="md">
      <Stack gap="lg">
        <Paper p="lg">
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Title order={1}>{title}</Title>
              {description ? (
                <Text c="dimmed" size="sm">
                  {description}
                </Text>
              ) : null}
              <Button component={Link} href="/" size="compact-sm" variant="subtle">
                Back to home
              </Button>
            </Stack>
            <Group gap="sm">
              {actions}
            </Group>
          </Group>
        </Paper>

        {children}
      </Stack>
    </Container>
  )
}
