import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { client_id, redirect_uri, response_type, state } = req.query;
  
  // Build the authorization URL with the API key in the query parameters
  const authUrl = new URL('https://sso.doneisbetter.com/api/oauth/authorize');
  authUrl.searchParams.set('client_id', client_id as string);
  authUrl.searchParams.set('redirect_uri', redirect_uri as string);
  authUrl.searchParams.set('response_type', response_type as string);
  authUrl.searchParams.set('state', state as string);
  authUrl.searchParams.set('x-api-key', process.env.NEXT_PUBLIC_DEFAULT_API_KEY!);

  // Redirect to the authorization endpoint
  res.redirect(authUrl.toString());
}
