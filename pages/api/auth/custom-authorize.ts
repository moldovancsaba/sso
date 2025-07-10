import { NextApiRequest, NextApiResponse } from 'next';
import { getBaseUrl } from '../../../src/utils/url-config';

// Helper function to normalize error responses
function normalizeError(error: any) {
  if (typeof error === 'string') return { error };
  if (error?.error) return error;
  return { error: 'An unexpected error occurred' };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { client_id, redirect_uri, response_type, state } = req.query;
  const identifier = req.method === 'POST' ? req.body.identifier : req.query.identifier;
  
  // Get the base URL for the current environment
  const baseUrl = getBaseUrl(req);
  
  // Build the authorization URL
  const authUrl = new URL(`${baseUrl}/api/oauth/authorize`);
  authUrl.searchParams.set('client_id', client_id as string);
  authUrl.searchParams.set('redirect_uri', redirect_uri as string);
  authUrl.searchParams.set('response_type', response_type as string);
  authUrl.searchParams.set('state', state as string);
  authUrl.searchParams.set('identifier', (identifier || 'anonymous') as string);

  // Set the API key in the headers instead of URL parameters
  const headers = new Headers();
  headers.set('x-api-key', process.env.NEXT_PUBLIC_DEFAULT_API_KEY!);

  // Make a fetch request with proper headers
  try {
    // Log the request details in production for debugging
    if (process.env.NODE_ENV === 'production') {
      console.log('Custom-authorize request:', {
        url: authUrl.toString(),
        headers: Object.fromEntries(headers.entries()),
        query: req.query
      });
    }

    const response = await fetch(authUrl.toString(), {
      headers,
      // Add proper request configuration
      method: req.method === 'POST' ? 'POST' : 'GET',
      body: req.method === 'POST' ? JSON.stringify({ identifier }) : undefined,
      redirect: 'follow',
    });

    // Log the response in production for debugging
    if (process.env.NODE_ENV === 'production') {
      console.log('OAuth response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('OAuth error response:', data);
      return res.status(response.status).json(normalizeError(data));
    }

    // If we got a redirect URL, use it
    if (data.redirect) {
      return res.redirect(data.redirect);
    }

    // Otherwise, return the data (e.g., login form data)
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in custom-authorize:', error);
    return res.status(500).json(normalizeError(error));
  }
}
