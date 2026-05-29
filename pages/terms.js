import Link from 'next/link'
import { Anchor, Box, Group, List, Stack, Text, Title } from '@mantine/core'
import { ArticleShell, PublicBrandFooter, PublicShell } from '@doneisbetter/gds-core/server'

export default function TermsPage() {
  return (
    <PublicShell
      brand={
        <Anchor component={Link} href="/" fw={700} td="none">
          DoneIsBetter SSO
        </Anchor>
      }
      compact
      footer={
        <PublicBrandFooter
          brandTitle="DoneIsBetter"
          compact
          description="Universal SSO service for shared identity, OAuth, and centralized account access."
          legal={<Text c="dimmed" size="xs">© 2025 DoneIsBetter. All rights reserved.</Text>}
          secondary={
            <Group gap="md">
              <Anchor component={Link} href="/" size="xs">Home</Anchor>
              <Anchor component={Link} href="/privacy" size="xs">Privacy Policy</Anchor>
              <Anchor component={Link} href="/data-deletion" size="xs">Data Deletion</Anchor>
            </Group>
          }
        />
      }
      maxContentWidth="md"
    >
      <Box py="xl">
        <ArticleShell
          eyebrow="Information"
          lead="Last Updated: 2025-10-13T16:22:35.000Z"
          title="Terms of Service"
        >
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={2}>1. Acceptance of Terms</Title>
          <Text size="sm">
            By accessing or using DoneIsBetter SSO, you agree to be bound by these Terms of Service.
            If you do not agree, you may not access or use the service.
          </Text>
          <Text size="sm">
            These terms apply to all users of the service, including individuals, organizations, and
            developers integrating our authentication flows.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>2. Description of Service</Title>
          <Text size="sm">DoneIsBetter SSO provides:</Text>
          <List spacing="xs" size="sm">
            <List.Item>Centralized user authentication across multiple applications</List.Item>
            <List.Item>Session management and validation</List.Item>
            <List.Item>Secure password-based and passwordless authentication</List.Item>
            <List.Item>Role-based access control and permissions management</List.Item>
            <List.Item>OAuth 2.0 compliant authorization flows</List.Item>
            <List.Item>API integration capabilities for third-party applications</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>3. User Accounts</Title>
          <Title order={3}>3.1 Account Registration</Title>
          <Text size="sm">To use the service, you must:</Text>
          <List spacing="xs" size="sm">
            <List.Item>Provide accurate, current, and complete information during registration</List.Item>
            <List.Item>Maintain and promptly update your account information</List.Item>
            <List.Item>Maintain the security and confidentiality of your password</List.Item>
            <List.Item>Be at least 18 years of age</List.Item>
            <List.Item>Comply with all applicable laws and regulations</List.Item>
          </List>

          <Title order={3}>3.2 Account Security</Title>
          <Text size="sm">You are responsible for:</Text>
          <List spacing="xs" size="sm">
            <List.Item>All activities that occur under your account</List.Item>
            <List.Item>Maintaining the confidentiality of your authentication credentials</List.Item>
            <List.Item>Immediately notifying us of any unauthorized use of your account</List.Item>
            <List.Item>Ensuring your account is not shared with others</List.Item>
          </List>

          <Title order={3}>3.3 Account Termination</Title>
          <Text size="sm">
            You may delete your account at any time via our{' '}
            <Anchor component={Link} href="/data-deletion">data deletion page</Anchor>. We reserve the
            right to suspend or terminate accounts that violate these terms or engage in fraudulent,
            abusive, or illegal activity.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>4. Acceptable Use</Title>
          <Title order={3}>4.1 Permitted Use</Title>
          <Text size="sm">
            You may use the service for legitimate authentication and authorization purposes only.
          </Text>
          <Title order={3}>4.2 Prohibited Activities</Title>
          <Text size="sm">You may not:</Text>
          <List spacing="xs" size="sm">
            <List.Item>Attempt to gain unauthorized access to the service or other users&apos; accounts</List.Item>
            <List.Item>Use the service to transmit malware, viruses, or malicious code</List.Item>
            <List.Item>Engage in activities that could damage, disable, or impair the service</List.Item>
            <List.Item>Attempt to reverse engineer, decompile, or disassemble any part of the service</List.Item>
            <List.Item>Use bots or scraping without authorization</List.Item>
            <List.Item>Violate applicable laws, regulations, or third-party rights</List.Item>
            <List.Item>Impersonate any person or entity or misrepresent your affiliation</List.Item>
            <List.Item>Interfere with the integrity or performance of the service</List.Item>
            <List.Item>Share your authentication credentials with unauthorized parties</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>5. API Integration and Developer Terms</Title>
          <Title order={3}>5.1 API Usage</Title>
          <Text size="sm">If you integrate our API into your application:</Text>
          <List spacing="xs" size="sm">
            <List.Item>You must comply with our <Anchor component={Link} href="/docs/api">API Documentation</Anchor> and best practices</List.Item>
            <List.Item>You are responsible for properly handling user data received through our API</List.Item>
            <List.Item>You must implement proper error handling and security measures</List.Item>
            <List.Item>You must respect rate limits and usage restrictions</List.Item>
          </List>

          <Title order={3}>5.2 Domain Registration</Title>
          <Text size="sm">
            Third-party applications must register their domains with us before integration. Contact{' '}
            <Anchor href="mailto:support@doneisbetter.com">support@doneisbetter.com</Anchor> for domain registration.
          </Text>

          <Title order={3}>5.3 OAuth Clients</Title>
          <Text size="sm">
            OAuth client applications must be registered and approved by system administrators. Unauthorized
            clients will be rejected by our CORS and authorization policies.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>6. Privacy and Data Protection</Title>
          <Text size="sm">
            Your privacy is important to us. Our collection, use, and protection of your personal
            information is governed by our{' '}
            <Anchor component={Link} href="/privacy">Privacy Policy</Anchor>, which is incorporated by reference.
          </Text>
          <Text size="sm">Key points:</Text>
          <List spacing="xs" size="sm">
            <List.Item>We use industry-standard encryption and security measures</List.Item>
            <List.Item>Passwords are hashed using bcrypt before storage</List.Item>
            <List.Item>Session data is protected with HttpOnly cookies</List.Item>
            <List.Item>Authentication logs are retained for 90 days</List.Item>
            <List.Item>You can request account deletion at any time</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>7. Intellectual Property</Title>
          <Title order={3}>7.1 Service Ownership</Title>
          <Text size="sm">
            The service, including all software, designs, graphics, and documentation, is owned by
            DoneIsBetter and protected by copyright, trademark, and other intellectual property laws.
          </Text>

          <Title order={3}>7.2 License Grant</Title>
          <Text size="sm">
            We grant you a limited, non-exclusive, non-transferable license to use the service in
            accordance with these terms. This license does not include the right to:
          </Text>
          <List spacing="xs" size="sm">
            <List.Item>Modify, copy, or create derivative works of the service</List.Item>
            <List.Item>Sell, resell, or redistribute the service</List.Item>
            <List.Item>Remove or alter any proprietary notices</List.Item>
          </List>

          <Title order={3}>7.3 Open Source</Title>
          <Text size="sm">
            Our SSO client libraries are available under the MIT License. See our{' '}
            <Anchor href="https://github.com/moldovancsaba/sso" rel="noopener noreferrer" target="_blank">
              GitHub repository
            </Anchor>{' '}
            for details.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>8. Disclaimer of Warranties</Title>
          <Text size="sm">
            The service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
            either express or implied.
          </Text>
          <Text size="sm">We do not warrant that:</Text>
          <List spacing="xs" size="sm">
            <List.Item>The service will be uninterrupted, secure, or error-free</List.Item>
            <List.Item>The results obtained from the service will be accurate or reliable</List.Item>
            <List.Item>Any errors or defects will be corrected</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>9. Limitation of Liability</Title>
          <Text size="sm">
            To the maximum extent permitted by law, DoneIsBetter shall not be liable for indirect,
            incidental, special, consequential, punitive, or similar damages arising out of or related to
            these terms or the service.
          </Text>
          <Text size="sm">
            Our total liability shall not exceed the amount you paid to us in the twelve months preceding
            the event giving rise to liability.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>10. Indemnification</Title>
          <Text size="sm">
            You agree to indemnify, defend, and hold harmless DoneIsBetter and its officers, directors,
            employees, and agents from claims, liabilities, damages, losses, and expenses arising out of or
            related to:
          </Text>
          <List spacing="xs" size="sm">
            <List.Item>Your use or misuse of the service</List.Item>
            <List.Item>Your violation of these terms</List.Item>
            <List.Item>Your violation of any third-party rights</List.Item>
            <List.Item>Your integration or deployment of the service in your applications</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>11. Service Modifications and Availability</Title>
          <Text size="sm">We reserve the right to:</Text>
          <List spacing="xs" size="sm">
            <List.Item>Modify, suspend, or discontinue the service at any time</List.Item>
            <List.Item>Change these terms with notice to users</List.Item>
            <List.Item>Implement rate limits or usage restrictions</List.Item>
            <List.Item>Perform maintenance that may temporarily affect availability</List.Item>
          </List>
          <Text size="sm">
            We will make reasonable efforts to provide advance notice of significant changes or planned
            downtime.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>12. Governing Law and Dispute Resolution</Title>
          <Text size="sm">
            These terms shall be governed by and construed in accordance with applicable laws, without
            regard to conflict of law principles.
          </Text>
          <Text size="sm">
            Any disputes arising out of or related to these terms or the service shall be resolved through
            binding arbitration, except that either party may seek injunctive relief in court to prevent
            infringement of intellectual property rights.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>13. Termination</Title>
          <Title order={3}>13.1 Termination by You</Title>
          <Text size="sm">
            You may terminate your account at any time via our{' '}
            <Anchor component={Link} href="/data-deletion">data deletion page</Anchor>.
          </Text>
          <Title order={3}>13.2 Termination by Us</Title>
          <Text size="sm">We may terminate or suspend your access immediately if you:</Text>
          <List spacing="xs" size="sm">
            <List.Item>Violate these terms</List.Item>
            <List.Item>Engage in fraudulent or illegal activity</List.Item>
            <List.Item>Pose a security risk to the service or other users</List.Item>
            <List.Item>Fail to comply with applicable laws and regulations</List.Item>
          </List>
          <Title order={3}>13.3 Effect of Termination</Title>
          <Text size="sm">Upon termination:</Text>
          <List spacing="xs" size="sm">
            <List.Item>Your right to use the service immediately ceases</List.Item>
            <List.Item>Your data will be deleted in accordance with our <Anchor component={Link} href="/privacy">Privacy Policy</Anchor></List.Item>
            <List.Item>Sections 7 through 12 survive termination</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>14. Miscellaneous</Title>
          <Title order={3}>14.1 Entire Agreement</Title>
          <Text size="sm">
            These terms, together with our Privacy Policy, constitute the entire agreement between you and
            DoneIsBetter regarding the service.
          </Text>
          <Title order={3}>14.2 Severability</Title>
          <Text size="sm">
            If any provision is found unenforceable, the remaining provisions remain in full force and effect.
          </Text>
          <Title order={3}>14.3 Waiver</Title>
          <Text size="sm">
            Our failure to enforce any provision does not constitute a waiver of that provision or our right
            to enforce it later.
          </Text>
          <Title order={3}>14.4 Assignment</Title>
          <Text size="sm">
            You may not assign or transfer these terms without prior written consent. We may assign them
            without restriction.
          </Text>
          <Title order={3}>14.5 Changes to Terms</Title>
          <Text size="sm">
            We may update these terms from time to time. Continued use of the service after changes
            constitutes acceptance of the updated terms.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>15. Contact Information</Title>
          <Text size="sm">If you have questions about these terms, contact us:</Text>
          <List spacing="xs" size="sm">
            <List.Item><strong>Email:</strong> <Anchor href="mailto:support@doneisbetter.com">support@doneisbetter.com</Anchor></List.Item>
            <List.Item><strong>Website:</strong> <Anchor href="https://sso.doneisbetter.com">https://sso.doneisbetter.com</Anchor></List.Item>
            <List.Item><strong>Documentation:</strong> <Anchor component={Link} href="/docs">API Documentation</Anchor></List.Item>
            <List.Item><strong>GitHub:</strong> <Anchor href="https://github.com/moldovancsaba/sso" rel="noopener noreferrer" target="_blank">GitHub Repository</Anchor></List.Item>
          </List>
        </Stack>
      </Stack>
        </ArticleShell>
      </Box>
    </PublicShell>
  )
}
