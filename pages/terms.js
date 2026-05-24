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

// WHAT: Public terms of service page for SSO service
// WHY: Legal agreement defining service usage terms; accessible without authentication
export default function TermsPage() {
  return (
    <Container size="md" py="xl"><Stack gap="xl">
      <Box>
        <Title order={1} mb="xs">Terms of Service</Title>
        <Text size="sm">Last Updated: 2025-10-13T16:22:35.000Z</Text>
      </Box>

      
        <Box>
          <Title order={2} mb="sm">1. Acceptance of Terms</Title>
          <Text size="sm">
            By accessing or using DoneIsBetter SSO ("the Service"), you agree to be bound by these Terms of Service 
            ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
          </Text>
          <Text size="sm">
            These Terms apply to all users of the Service, including individuals, organizations, and developers 
            integrating our SSO authentication into their applications.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">2. Description of Service</Title>
          <Text size="sm">
            DoneIsBetter SSO is a Single Sign-On (SSO) authentication service that provides:
          </Text>
          <List spacing="xs">
            <List.Item>Centralized user authentication across multiple applications</List.Item>
            <List.Item>Session management and validation</List.Item>
            <List.Item>Secure password-based and passwordless (magic link) authentication</List.Item>
            <List.Item>Role-based access control and permissions management</List.Item>
            <List.Item>OAuth 2.0 compliant authorization flows</List.Item>
            <List.Item>API integration capabilities for third-party applications</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">3. User Accounts</Title>
          
          <Title order={3} mb="xs">3.1 Account Registration</Title>
          <Text size="sm">To use the Service, you must:</Text>
          <List spacing="xs">
            <List.Item>Provide accurate, current, and complete information during registration</List.Item>
            <List.Item>Maintain and promptly update your account information</List.Item>
            <List.Item>Maintain the security and confidentiality of your password</List.Item>
            <List.Item>Be at least 18 years of age</List.Item>
            <List.Item>Comply with all applicable laws and regulations</List.Item>
          </List>

          <Title order={3} mb="xs">3.2 Account Security</Title>
          <Text size="sm">You are responsible for:</Text>
          <List spacing="xs">
            <List.Item>All activities that occur under your account</List.Item>
            <List.Item>Maintaining the confidentiality of your authentication credentials</List.Item>
            <List.Item>Immediately notifying us of any unauthorized use of your account</List.Item>
            <List.Item>Ensuring your account is not shared with others</List.Item>
          </List>

          <Title order={3} mb="xs">3.3 Account Termination</Title>
          <Text size="sm">
            You may delete your account at any time via our <Link href="/data-deletion">data deletion page</Link>. 
            We reserve the right to suspend or terminate accounts that violate these Terms or engage in 
            fraudulent, abusive, or illegal activity.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">4. Acceptable Use</Title>
          
          <Title order={3} mb="xs">4.1 Permitted Use</Title>
          <Text size="sm">You may use the Service for legitimate authentication and authorization purposes only.</Text>

          <Title order={3} mb="xs">4.2 Prohibited Activities</Title>
          <Text size="sm">You may not:</Text>
          <List spacing="xs">
            <List.Item>Attempt to gain unauthorized access to the Service or other users' accounts</List.Item>
            <List.Item>Use the Service to transmit malware, viruses, or malicious code</List.Item>
            <List.Item>Engage in activities that could damage, disable, or impair the Service</List.Item>
            <List.Item>Attempt to reverse engineer, decompile, or disassemble any part of the Service</List.Item>
            <List.Item>Use automated means (bots, scrapers) to access the Service without authorization</List.Item>
            <List.Item>Violate any applicable laws, regulations, or third-party rights</List.Item>
            <List.Item>Impersonate any person or entity or misrepresent your affiliation</List.Item>
            <List.Item>Interfere with or disrupt the integrity or performance of the Service</List.Item>
            <List.Item>Share your authentication credentials with unauthorized parties</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">5. API Integration and Developer Terms</Title>
          
          <Title order={3} mb="xs">5.1 API Usage</Title>
          <Text size="sm">If you integrate our API into your application:</Text>
          <List spacing="xs">
            <List.Item>You must comply with our <Link href="/docs/api">API Documentation</Link> and best practices</List.Item>
            <List.Item>You are responsible for properly handling user data received through our API</List.Item>
            <List.Item>You must implement proper error handling and security measures</List.Item>
            <List.Item>You must respect rate limits and usage restrictions</List.Item>
          </List>

          <Title order={3} mb="xs">5.2 Domain Registration</Title>
          <Text size="sm">
            Third-party applications must register their domains with us before integration. 
            Contact <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a> for domain registration.
          </Text>

          <Title order={3} mb="xs">5.3 OAuth Clients</Title>
          <Text size="sm">
            OAuth client applications must be registered and approved by system administrators. 
            Unauthorized OAuth clients will be rejected by our CORS and authorization policies.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">6. Privacy and Data Protection</Title>
          <Text size="sm">
            Your privacy is important to us. Our collection, use, and protection of your personal information 
            is governed by our <Link href="/privacy">Privacy Policy</Link>, which is incorporated into these Terms by reference.
          </Text>
          <Text size="sm">Key points:</Text>
          <List spacing="xs">
            <List.Item>We use industry-standard encryption and security measures</List.Item>
            <List.Item>Passwords are hashed using bcrypt before storage</List.Item>
            <List.Item>Session data is protected with HttpOnly cookies</List.Item>
            <List.Item>Authentication logs are retained for 90 days</List.Item>
            <List.Item>You can request account deletion at any time</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">7. Intellectual Property</Title>
          
          <Title order={3} mb="xs">7.1 Service Ownership</Title>
          <Text size="sm">
            The Service, including all software, designs, graphics, and documentation, is owned by DoneIsBetter 
            and protected by copyright, trademark, and other intellectual property laws.
          </Text>

          <Title order={3} mb="xs">7.2 License Grant</Title>
          <Text size="sm">
            We grant you a limited, non-exclusive, non-transferable license to use the Service in accordance 
            with these Terms. This license does not include the right to:
          </Text>
          <List spacing="xs">
            <List.Item>Modify, copy, or create derivative works of the Service</List.Item>
            <List.Item>Sell, resell, or redistribute the Service</List.Item>
            <List.Item>Remove or alter any proprietary notices</List.Item>
          </List>

          <Title order={3} mb="xs">7.3 Open Source</Title>
          <Text size="sm">
            Our SSO client libraries are available under the MIT License. See our 
            <a href="https://github.com/moldovancsaba/sso" target="_blank" rel="noopener noreferrer"> GitHub repository</a> for details.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">8. Disclaimer of Warranties</Title>
          <Text size="sm">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, 
            INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </Text>
          <Text size="sm">We do not warrant that:</Text>
          <List spacing="xs">
            <List.Item>The Service will be uninterrupted, secure, or error-free</List.Item>
            <List.Item>The results obtained from the Service will be accurate or reliable</List.Item>
            <List.Item>Any errors or defects will be corrected</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">9. Limitation of Liability</Title>
          <Text size="sm">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, DONEISBETTER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR USE, ARISING OUT OF 
            OR RELATED TO THESE TERMS OR THE SERVICE.
          </Text>
          <Text size="sm">
            OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US (IF ANY) IN THE TWELVE (12) MONTHS 
            PRECEDING THE EVENT GIVING RISE TO LIABILITY.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">10. Indemnification</Title>
          <Text size="sm">
            You agree to indemnify, defend, and hold harmless DoneIsBetter and its officers, directors, employees, 
            and agents from any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) 
            arising out of or related to:
          </Text>
          <List spacing="xs">
            <List.Item>Your use or misuse of the Service</List.Item>
            <List.Item>Your violation of these Terms</List.Item>
            <List.Item>Your violation of any third-party rights</List.Item>
            <List.Item>Your integration or deployment of the Service in your applications</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">11. Service Modifications and Availability</Title>
          <Text size="sm">We reserve the right to:</Text>
          <List spacing="xs">
            <List.Item>Modify, suspend, or discontinue the Service at any time</List.Item>
            <List.Item>Change these Terms with notice to users</List.Item>
            <List.Item>Implement rate limits or usage restrictions</List.Item>
            <List.Item>Perform maintenance that may temporarily affect service availability</List.Item>
          </List>
          <Text size="sm">
            We will make reasonable efforts to provide advance notice of significant changes or planned downtime.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">12. Governing Law and Dispute Resolution</Title>
          <Text size="sm">
            These Terms shall be governed by and construed in accordance with applicable laws, without regard to 
            conflict of law principles.
          </Text>
          <Text size="sm">
            Any disputes arising out of or related to these Terms or the Service shall be resolved through binding 
            arbitration, except that either party may seek injunctive relief in court to prevent infringement of 
            intellectual property rights.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">13. Termination</Title>
          
          <Title order={3} mb="xs">13.1 Termination by You</Title>
          <Text size="sm">
            You may terminate your account at any time via our <Link href="/data-deletion">data deletion page</Link>.
          </Text>

          <Title order={3} mb="xs">13.2 Termination by Us</Title>
          <Text size="sm">We may terminate or suspend your access immediately, without prior notice, if you:</Text>
          <List spacing="xs">
            <List.Item>Violate these Terms</List.Item>
            <List.Item>Engage in fraudulent or illegal activity</List.Item>
            <List.Item>Pose a security risk to the Service or other users</List.Item>
            <List.Item>Fail to comply with applicable laws and regulations</List.Item>
          </List>

          <Title order={3} mb="xs">13.3 Effect of Termination</Title>
          <Text size="sm">Upon termination:</Text>
          <List spacing="xs">
            <List.Item>Your right to use the Service immediately ceases</List.Item>
            <List.Item>Your data will be deleted in accordance with our <Link href="/privacy">Privacy Policy</Link></List.Item>
            <List.Item>Sections 7-12 of these Terms shall survive termination</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">14. Miscellaneous</Title>
          
          <Title order={3} mb="xs">14.1 Entire Agreement</Title>
          <Text size="sm">
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and 
            DoneIsBetter regarding the Service.
          </Text>

          <Title order={3} mb="xs">14.2 Severability</Title>
          <Text size="sm">
            If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain 
            in full force and effect.
          </Text>

          <Title order={3} mb="xs">14.3 Waiver</Title>
          <Text size="sm">
            Our failure to enforce any provision of these Terms shall not constitute a waiver of that provision 
            or our right to enforce it in the future.
          </Text>

          <Title order={3} mb="xs">14.4 Assignment</Title>
          <Text size="sm">
            You may not assign or transfer these Terms without our prior written consent. We may assign these 
            Terms without restriction.
          </Text>

          <Title order={3} mb="xs">14.5 Changes to Terms</Title>
          <Text size="sm">
            We may update these Terms from time to time. Continued use of the Service after changes constitutes 
            acceptance of the updated Terms.
          </Text>
        </Box>

        <Box>
          <Title order={2} mb="sm">15. Contact Information</Title>
          <Text size="sm">If you have questions about these Terms, please contact us:</Text>
          <List spacing="xs">
            <List.Item><strong>Email:</strong> <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a></List.Item>
            <List.Item><strong>Website:</strong> <a href="https://sso.doneisbetter.com">https://sso.doneisbetter.com</a></List.Item>
            <List.Item><strong>Documentation:</strong> <Link href="/docs">API Documentation</Link></List.Item>
            <List.Item><strong>GitHub:</strong> <a href="https://github.com/moldovancsaba/sso" target="_blank" rel="noopener noreferrer">GitHub Repository</a></List.Item>
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
