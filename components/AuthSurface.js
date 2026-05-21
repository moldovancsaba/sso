import { isValidElement } from 'react'
import { Center, Container, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core'

export default function AuthSurface({
  children,
  description,
  icon,
  maxWidth = 520,
  title,
}) {
  const Icon = icon
  const iconNode = isValidElement(Icon) ? Icon : Icon ? <Icon size={28} stroke={1.8} /> : null

  return (
    <Center mih="100vh" px="md" py="xl" bg="gray.0">
      <Container size={maxWidth} w="100%">
        <Paper p="xl" radius="xl" shadow="lg" withBorder>
          <Stack gap="lg">
            <Stack align="center" gap="sm">
              {iconNode ? (
                <ThemeIcon color="brand" radius="xl" size={56} variant="light">
                  {iconNode}
                </ThemeIcon>
              ) : null}
              <Stack align="center" gap={4}>
                <Title order={1} ta="center">
                  {title}
                </Title>
                {description ? (
                  <Text c="dimmed" maw={420} size="sm" ta="center">
                    {description}
                  </Text>
                ) : null}
              </Stack>
            </Stack>
            {children}
          </Stack>
        </Paper>
      </Container>
    </Center>
  )
}
