import { Group, Loader, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import {
  IconAlertCircle,
  IconChartBar,
  IconBan,
  IconCircleCheck,
  IconInfoCircle,
  IconInbox,
  IconShieldCheck,
} from '@tabler/icons-react'

const stateConfig = {
  disabled: { color: 'gray', icon: IconBan, title: 'Unavailable' },
  empty: { color: 'gray', icon: IconInbox, title: 'Nothing to show' },
  error: { color: 'red', icon: IconAlertCircle, title: 'Something went wrong' },
  info: { color: 'blue', icon: IconInfoCircle, title: 'Information' },
  'not-enough-data': { color: 'yellow', icon: IconChartBar, title: 'Not enough data' },
  permission: { color: 'orange', icon: IconShieldCheck, title: 'Permission required' },
  success: { color: 'teal', icon: IconCircleCheck, title: 'Success' },
}

export default function StateBlock({
  action = null,
  compact = false,
  description,
  icon = null,
  kind = null,
  title,
  variant = null,
}) {
  const resolvedVariant = variant || kind || 'info'

  if (resolvedVariant === 'loading') {
    return (
      <Stack
        align={compact ? 'flex-start' : 'center'}
        gap="sm"
        justify="center"
        py={compact ? 'md' : 'xl'}
        ta={compact ? 'left' : 'center'}
      >
        <Loader />
        {title ? <Title order={compact ? 4 : 3}>{title}</Title> : null}
        {description ? (
          <Text c="dimmed" maw={compact ? undefined : 480} size="sm">
            {description}
          </Text>
        ) : null}
      </Stack>
    )
  }

  const config = stateConfig[resolvedVariant] || stateConfig.info
  const Icon = config.icon

  return (
    <Stack
      align={compact ? 'flex-start' : 'center'}
      gap="md"
      justify="center"
      py={compact ? 'md' : 'xl'}
      ta={compact ? 'left' : 'center'}
    >
      <ThemeIcon color={config.color} radius="xl" size={compact ? 'lg' : 'xl'} variant="light">
        {icon || <Icon size={compact ? 16 : 18} stroke={1.8} />}
      </ThemeIcon>
      <Stack align={compact ? 'flex-start' : 'center'} gap={6}>
        <Title order={compact ? 4 : 3}>{title || config.title}</Title>
        {description ? (
          <Text c="dimmed" maw={compact ? undefined : 480}>
            {description}
          </Text>
        ) : null}
      </Stack>
      {action ? <Group>{action}</Group> : null}
    </Stack>
  )
}
