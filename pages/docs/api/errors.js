import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function ApiErrors() {
  return (
    \u003cDocsLayout\u003e
      \u003cdiv className={styles.container}\u003e
        \u003cheader className={styles.header}\u003e
          \u003ch1\u003eAPI Error Reference\u003c/h1\u003e
        \u003c/header\u003e
        \u003cmain className={styles.main}\u003e
          \u003csection className={styles.section}\u003e
            \u003ch2\u003eError Response Format\u003c/h2\u003e
            \u003cp\u003e
              All API errors follow a consistent format to help with error handling and debugging.
              Each error response includes an error code, message, and additional context when available.
            \u003c/p\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
                {`{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Additional error context (optional)
  }
}`}
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003eCommon Error Codes\u003c/h2\u003e
            \u003ch3\u003eAuthentication Errors\u003c/h3\u003e
            \u003cul\u003e
              \u003cli\u003e
                \u003ccode\u003eINVALID_CREDENTIALS\u003c/code\u003e
                \u003cp\u003eProvided authentication credentials are invalid.\u003c/p\u003e
                \u003cdiv className={styles.codeBlock}\u003e
                  \u003cpre\u003e
                    {`{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid username or password",
  "details": {
    "field": "password"
  }
}`}
                  \u003c/pre\u003e
                \u003c/div\u003e
              \u003c/li\u003e
              \u003cli\u003e
                \u003ccode\u003eSESSION_EXPIRED\u003c/code\u003e
                \u003cp\u003eThe user's session has expired and requires re-authentication.\u003c/p\u003e
                \u003cdiv className={styles.codeBlock}\u003e
                  \u003cpre\u003e
                    {`{
  "error": "SESSION_EXPIRED",
  "message": "Your session has expired. Please sign in again.",
  "details": {
    "expiredAt": "2025-07-21T22:00:00Z"
  }
}`}
                  \u003c/pre\u003e
                \u003c/div\u003e
              \u003c/li\u003e
            \u003c/ul\u003e

            \u003ch3\u003eAuthorization Errors\u003c/h3\u003e
            \u003cul\u003e
              \u003cli\u003e
                \u003ccode\u003eUNAUTHORIZED\u003c/code\u003e
                \u003cp\u003eUser is not authenticated.\u003c/p\u003e
                \u003cdiv className={styles.codeBlock}\u003e
                  \u003cpre\u003e
                    {`{
  "error": "UNAUTHORIZED",
  "message": "Authentication required to access this resource"
}`}
                  \u003c/pre\u003e
                \u003c/div\u003e
              \u003c/li\u003e
              \u003cli\u003e
                \u003ccode\u003eFORBIDDEN\u003c/code\u003e
                \u003cp\u003eUser lacks required permissions.\u003c/p\u003e
                \u003cdiv className={styles.codeBlock}\u003e
                  \u003cpre\u003e
                    {`{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions to perform this action",
  "details": {
    "requiredPermission": "canManageUsers"
  }
}`}
                  \u003c/pre\u003e
                \u003c/div\u003e
              \u003c/li\u003e
            \u003c/ul\u003e

            \u003ch3\u003eValidation Errors\u003c/h3\u003e
            \u003cul\u003e
              \u003cli\u003e
                \u003ccode\u003eINVALID_INPUT\u003c/code\u003e
                \u003cp\u003eRequest contains invalid data.\u003c/p\u003e
                \u003cdiv className={styles.codeBlock}\u003e
                  \u003cpre\u003e
                    {`{
  "error": "INVALID_INPUT",
  "message": "Invalid request parameters",
  "details": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}`}
                  \u003c/pre\u003e
                \u003c/div\u003e
              \u003c/li\u003e
            \u003c/ul\u003e

            \u003ch3\u003eServer Errors\u003c/h3\u003e
            \u003cul\u003e
              \u003cli\u003e
                \u003ccode\u003eINTERNAL_ERROR\u003c/code\u003e
                \u003cp\u003eUnexpected server error occurred.\u003c/p\u003e
                \u003cdiv className={styles.codeBlock}\u003e
                  \u003cpre\u003e
                    {`{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "details": {
    "requestId": "req_123abc",
    "timestamp": "2025-07-21T22:15:30Z"
  }
}`}
                  \u003c/pre\u003e
                \u003c/div\u003e
              \u003c/li\u003e
            \u003c/ul\u003e
          \u003c/section\u003e

          \u003csection className={styles.section}\u003e
            \u003ch2\u003eError Handling Best Practices\u003c/h2\u003e
            \u003cul\u003e
              \u003cli\u003eAlways check the error code rather than the message for error handling logic\u003c/li\u003e
              \u003cli\u003eImplement appropriate retry logic for transient errors\u003c/li\u003e
              \u003cli\u003eLog error details for debugging\u003c/li\u003e
              \u003cli\u003eProvide user-friendly error messages in your UI\u003c/li\u003e
            \u003c/ul\u003e
            \u003cdiv className={styles.codeBlock}\u003e
              \u003cpre\u003e
                {`// Example error handling
try {
  await sso.validateSession();
} catch (error) {
  switch (error.code) {
    case 'SESSION_EXPIRED':
      redirectToLogin();
      break;
    case 'FORBIDDEN':
      showPermissionError();
      break;
    default:
      showGenericError();
  }
}`}
              \u003c/pre\u003e
            \u003c/div\u003e
          \u003c/section\u003e
        \u003c/main\u003e
      \u003c/div\u003e
    \u003c/DocsLayout\u003e
  );
}
