import Link from 'next/link';
import {
  Stack,
  Title,
  Text,
  Paper,
  Code,
  List,
  Box,
  Anchor,
  Container,
  Divider,
  Group,
} from '@mantine/core';

// WHAT: Public privacy policy page for SSO service
// WHY: Required for transparency and legal compliance; accessible without authentication
export default function PrivacyPage() {
  return (
    <Container size="md" py="xl"><Stack gap="xl">
      <Box>
        <Title order={1} mb="xs">Privacy Policy</Title>
        <Text size="sm">Last Updated: 2025-10-13T16:22:35.000Z</Text>
      </Box>

      
        <Box>
          <Title order={2} mb="sm">Introduction</Title>
          <Text size="sm">
            DoneIsBetter SSO ("we", "our", or "us") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
            when you use our Single Sign-On (SSO) authentication service.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">Information We Collect</Title>
          
          <Title order={3} mb="xs">Personal Information</Title>
          <Text size="sm">We collect the following information when you register or use our service:</Text>
          <List spacing="xs">
            <List.Item><strong>Email Address</strong> - Required for account creation and authentication</List.Item>
            <List.Item><strong>Password</strong> - Stored using industry-standard bcrypt hashing</List.Item>
            <List.Item><strong>Username</strong> - Optional display name</List.Item>
            <List.Item><strong>Session Data</strong> - Authentication tokens and session identifiers</List.Item>
          </List>

          <Title order={3} mb="xs">Automatically Collected Information</Title>
          <Text size="sm">When you use our service, we automatically collect:</Text>
          <List spacing="xs">
            <List.Item><strong>IP Address</strong> - For security monitoring and fraud prevention</List.Item>
            <List.Item><strong>User Agent</strong> - Browser and device information</List.Item>
            <List.Item><strong>Authentication Logs</strong> - Login attempts, timestamps, and success/failure status</List.Item>
            <List.Item><strong>Session Activity</strong> - Session creation, validation, and expiration events</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">How We Use Your Information</Title>
          <Text size="sm">We use the collected information for the following purposes:</Text>
          <List spacing="xs">
            <List.Item><strong>Authentication</strong> - To verify your identity and maintain secure sessions</List.Item>
            <List.Item><strong>Service Delivery</strong> - To provide SSO functionality across integrated applications</List.Item>
            <List.Item><strong>Security</strong> - To detect and prevent unauthorized access, fraud, and abuse</List.Item>
            <List.Item><strong>Account Management</strong> - To manage your account, process password resets, and handle support requests</List.Item>
            <List.Item><strong>Communication</strong> - To send authentication-related emails (magic links, password reset, PIN verification)</List.Item>
            <List.Item><strong>Compliance</strong> - To comply with legal obligations and enforce our terms of service</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">Data Storage and Security</Title>
          
          <Title order={3} mb="xs">Data Storage</Title>
          <Text size="sm">Your data is stored in MongoDB databases with the following protections:</Text>
          <List spacing="xs">
            <List.Item>Production and development environments use the same secure database infrastructure</List.Item>
            <List.Item>All connections use encrypted channels (SSL/TLS)</List.Item>
            <List.Item>Passwords are hashed using bcrypt with salt rounds before storage</List.Item>
            <List.Item>Session tokens are securely generated and stored with HttpOnly cookies</List.Item>
          </List>

          <Title order={3} mb="xs">Security Measures</Title>
          <Text size="sm">We implement industry-standard security practices:</Text>
          <List spacing="xs">
            <List.Item><strong>Encryption</strong> - HTTPS/TLS for all data in transit</List.Item>
            <List.Item><strong>Authentication</strong> - Multi-factor authentication options (PIN verification, magic links)</List.Item>
            <List.Item><strong>Session Management</strong> - Automatic session expiration and validation</List.Item>
            <List.Item><strong>Access Controls</strong> - Role-based permissions and audit logging</List.Item>
            <List.Item><strong>Rate Limiting</strong> - Protection against brute force attacks</List.Item>
            <List.Item><strong>CORS Policies</strong> - Strict cross-origin resource sharing controls</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">Data Sharing and Disclosure</Title>
          
          <Title order={3} mb="xs">Third-Party Services</Title>
          <Text size="sm">We use the following third-party services:</Text>
          <List spacing="xs">
            <List.Item><strong>Vercel</strong> - Hosting and deployment infrastructure</List.Item>
            <List.Item><strong>MongoDB Atlas</strong> - Database hosting and management</List.Item>
            <List.Item><strong>Email Service Provider</strong> - For sending authentication emails (Resend/Nodemailer)</List.Item>
          </List>

          <Title order={3} mb="xs">Integrated Applications</Title>
          <Text size="sm">
            When you authenticate through our SSO service, we share limited information with integrated applications:
          </Text>
          <List spacing="xs">
            <List.Item>User ID (unique identifier)</List.Item>
            <List.Item>Email address</List.Item>
            <List.Item>Username (if provided)</List.Item>
            <List.Item>Permission levels (admin status, role-based access)</List.Item>
          </List>

          <Title order={3} mb="xs">Legal Requirements</Title>
          <Text size="sm">We may disclose your information if required by law, court order, or government regulation.</Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">Your Rights and Choices</Title>
          <Text size="sm">You have the following rights regarding your personal information:</Text>
          <List spacing="xs">
            <List.Item><strong>Access</strong> - Request access to your personal data through your account page</List.Item>
            <List.Item><strong>Correction</strong> - Update your email, username, or password at any time</List.Item>
            <List.Item><strong>Deletion</strong> - Request account deletion via our <Link href="/data-deletion">data deletion page</Link></List.Item>
            <List.Item><strong>Export</strong> - Request a copy of your data (contact support@doneisbetter.com)</List.Item>
            <List.Item><strong>Opt-Out</strong> - Manage email notification preferences in your account settings</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">Data Retention</Title>
          <Text size="sm">We retain your information as follows:</Text>
          <List spacing="xs">
            <List.Item><strong>Active Accounts</strong> - Data retained indefinitely while account is active</List.Item>
            <List.Item><strong>Deleted Accounts</strong> - Data permanently deleted within 30 days of deletion request</List.Item>
            <List.Item><strong>Authentication Logs</strong> - Retained for 90 days for security and audit purposes</List.Item>
            <List.Item><strong>Session Data</strong> - Automatically deleted upon session expiration</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">Cookies and Tracking</Title>
          <Text size="sm">We use cookies for the following purposes:</Text>
          <List spacing="xs">
            <List.Item><strong>Authentication Cookies</strong> - HttpOnly cookies with domain <code>.doneisbetter.com</code></List.Item>
            <List.Item><strong>Session Management</strong> - To maintain your logged-in state across integrated applications</List.Item>
            <List.Item><strong>Security</strong> - To prevent cross-site request forgery (CSRF) attacks</List.Item>
          </List>
          <Text size="sm">
            Our cookies are essential for service functionality. Disabling cookies will prevent authentication.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">Children's Privacy</Title>
          <Text size="sm">
            Our service is not intended for users under 18 years of age. We do not knowingly collect 
            personal information from children. If you believe we have collected information from a child, 
            please contact us immediately.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">International Data Transfers</Title>
          <Text size="sm">
            Your information may be transferred to and processed in countries other than your country of residence. 
            We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">Changes to This Privacy Policy</Title>
          <Text size="sm">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
            the new Privacy Policy on this page and updating the "Last Updated" date.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">Contact Us</Title>
          <Text size="sm">If you have questions about this Privacy Policy or our data practices, please contact us:</Text>
          <List spacing="xs">
            <List.Item><strong>Email:</strong> <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a></List.Item>
            <List.Item><strong>Website:</strong> <a href="https://sso.doneisbetter.com">https://sso.doneisbetter.com</a></List.Item>
            <List.Item><strong>Documentation:</strong> <Link href="/docs">API Documentation</Link></List.Item>
          </List>
        </Box>
      

      <Divider mt="xl" />
      <Group justify="space-between" align="center" wrap="wrap">
        <Text size="xs" c="dimmed">© 2025 DoneIsBetter. All rights reserved.</Text>
        <Group gap="md">
          <Link href="/">Home</Link> | 
          <Link href="/privacy" style={{ margin: '0 0.5rem' }}>Privacy Policy</Link> | 
          <Link href="/terms" style={{ margin: '0 0.5rem' }}>Terms of Service</Link> | 
          <Link href="/data-deletion">Data Deletion</Link>
        </Group>
      </Group>
    </Stack></Container>
  );
}
