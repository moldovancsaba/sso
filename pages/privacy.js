import Link from 'next/link'
import { Anchor, List, Stack, Text, Title } from '@mantine/core'
import PublicPageLayout from '../components/PublicPageLayout'

export default function PrivacyPage() {
  return (
    <PublicPageLayout subtitle="Last Updated: 2025-10-13T16:22:35.000Z" title="Privacy Policy">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={2}>Introduction</Title>
          <Text size="sm">
            DoneIsBetter SSO ("we", "our", or "us") is committed to protecting your privacy. This
            Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you use our Single Sign-On authentication service.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>Information We Collect</Title>
          <Title order={3}>Personal Information</Title>
          <Text size="sm">We collect the following information when you register or use our service:</Text>
          <List spacing="xs" size="sm">
            <List.Item><strong>Email Address</strong> - Required for account creation and authentication</List.Item>
            <List.Item><strong>Password</strong> - Stored using industry-standard bcrypt hashing</List.Item>
            <List.Item><strong>Username</strong> - Optional display name</List.Item>
            <List.Item><strong>Session Data</strong> - Authentication tokens and session identifiers</List.Item>
          </List>

          <Title order={3}>Automatically Collected Information</Title>
          <Text size="sm">When you use our service, we automatically collect:</Text>
          <List spacing="xs" size="sm">
            <List.Item><strong>IP Address</strong> - For security monitoring and fraud prevention</List.Item>
            <List.Item><strong>User Agent</strong> - Browser and device information</List.Item>
            <List.Item><strong>Authentication Logs</strong> - Login attempts, timestamps, and success or failure status</List.Item>
            <List.Item><strong>Session Activity</strong> - Session creation, validation, and expiration events</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>How We Use Your Information</Title>
          <Text size="sm">We use the collected information for the following purposes:</Text>
          <List spacing="xs" size="sm">
            <List.Item><strong>Authentication</strong> - To verify your identity and maintain secure sessions</List.Item>
            <List.Item><strong>Service Delivery</strong> - To provide SSO functionality across integrated applications</List.Item>
            <List.Item><strong>Security</strong> - To detect and prevent unauthorized access, fraud, and abuse</List.Item>
            <List.Item><strong>Account Management</strong> - To manage your account, process password resets, and handle support requests</List.Item>
            <List.Item><strong>Communication</strong> - To send authentication-related emails such as magic links, password reset, and PIN verification</List.Item>
            <List.Item><strong>Compliance</strong> - To comply with legal obligations and enforce our terms of service</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>Data Storage and Security</Title>
          <Title order={3}>Data Storage</Title>
          <Text size="sm">Your data is stored in MongoDB databases with the following protections:</Text>
          <List spacing="xs" size="sm">
            <List.Item>Production and development environments use the same secure database infrastructure</List.Item>
            <List.Item>All connections use encrypted channels (SSL/TLS)</List.Item>
            <List.Item>Passwords are hashed using bcrypt with salt rounds before storage</List.Item>
            <List.Item>Session tokens are securely generated and stored with HttpOnly cookies</List.Item>
          </List>

          <Title order={3}>Security Measures</Title>
          <Text size="sm">We implement industry-standard security practices:</Text>
          <List spacing="xs" size="sm">
            <List.Item><strong>Encryption</strong> - HTTPS/TLS for all data in transit</List.Item>
            <List.Item><strong>Authentication</strong> - Multi-factor authentication options such as PIN verification and magic links</List.Item>
            <List.Item><strong>Session Management</strong> - Automatic session expiration and validation</List.Item>
            <List.Item><strong>Access Controls</strong> - Role-based permissions and audit logging</List.Item>
            <List.Item><strong>Rate Limiting</strong> - Protection against brute force attacks</List.Item>
            <List.Item><strong>CORS Policies</strong> - Strict cross-origin resource sharing controls</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>Data Sharing and Disclosure</Title>
          <Title order={3}>Third-Party Services</Title>
          <Text size="sm">We use the following third-party services:</Text>
          <List spacing="xs" size="sm">
            <List.Item><strong>Vercel</strong> - Hosting and deployment infrastructure</List.Item>
            <List.Item><strong>MongoDB Atlas</strong> - Database hosting and management</List.Item>
            <List.Item><strong>Email Service Provider</strong> - For sending authentication emails</List.Item>
          </List>

          <Title order={3}>Integrated Applications</Title>
          <Text size="sm">
            When you authenticate through our SSO service, we share limited information with integrated
            applications:
          </Text>
          <List spacing="xs" size="sm">
            <List.Item>User ID as a unique identifier</List.Item>
            <List.Item>Email address</List.Item>
            <List.Item>Username if provided</List.Item>
            <List.Item>Permission levels including admin status and role-based access</List.Item>
          </List>

          <Title order={3}>Legal Requirements</Title>
          <Text size="sm">
            We may disclose your information if required by law, court order, or government regulation.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>Your Rights and Choices</Title>
          <Text size="sm">You have the following rights regarding your personal information:</Text>
          <List spacing="xs" size="sm">
            <List.Item><strong>Access</strong> - Request access to your personal data through your account page</List.Item>
            <List.Item><strong>Correction</strong> - Update your email, username, or password at any time</List.Item>
            <List.Item>
              <strong>Deletion</strong> - Request account deletion via our{' '}
              <Anchor component={Link} href="/data-deletion">data deletion page</Anchor>
            </List.Item>
            <List.Item><strong>Export</strong> - Request a copy of your data at support@doneisbetter.com</List.Item>
            <List.Item><strong>Opt-Out</strong> - Manage email notification preferences in your account settings</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>Data Retention</Title>
          <Text size="sm">We retain your information as follows:</Text>
          <List spacing="xs" size="sm">
            <List.Item><strong>Active Accounts</strong> - Data retained indefinitely while the account is active</List.Item>
            <List.Item><strong>Deleted Accounts</strong> - Data permanently deleted within 30 days of request</List.Item>
            <List.Item><strong>Authentication Logs</strong> - Retained for 90 days for security and audit purposes</List.Item>
            <List.Item><strong>Session Data</strong> - Automatically deleted upon session expiration</List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>Cookies and Tracking</Title>
          <Text size="sm">We use cookies for the following purposes:</Text>
          <List spacing="xs" size="sm">
            <List.Item><strong>Authentication Cookies</strong> - HttpOnly cookies with domain <code>.doneisbetter.com</code></List.Item>
            <List.Item><strong>Session Management</strong> - To maintain your logged-in state across integrated applications</List.Item>
            <List.Item><strong>Security</strong> - To prevent CSRF attacks</List.Item>
          </List>
          <Text size="sm">
            Our cookies are essential for service functionality. Disabling cookies prevents authentication.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>Children&apos;s Privacy</Title>
          <Text size="sm">
            Our service is not intended for users under 18 years of age. We do not knowingly collect
            personal information from children. If you believe we have collected information from a child,
            contact us immediately.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>International Data Transfers</Title>
          <Text size="sm">
            Your information may be transferred to and processed in countries other than your country of
            residence. We ensure appropriate safeguards are in place to protect your data.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>Changes to This Privacy Policy</Title>
          <Text size="sm">
            We may update this Privacy Policy from time to time. We will notify you by posting the new
            policy on this page and updating the last updated date.
          </Text>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>Contact Us</Title>
          <Text size="sm">If you have questions about this Privacy Policy or our data practices:</Text>
          <List spacing="xs" size="sm">
            <List.Item><strong>Email:</strong> <Anchor href="mailto:support@doneisbetter.com">support@doneisbetter.com</Anchor></List.Item>
            <List.Item><strong>Website:</strong> <Anchor href="https://sso.doneisbetter.com">https://sso.doneisbetter.com</Anchor></List.Item>
            <List.Item><strong>Documentation:</strong> <Anchor component={Link} href="/docs">API Documentation</Anchor></List.Item>
          </List>
        </Stack>
      </Stack>
    </PublicPageLayout>
  )
}
