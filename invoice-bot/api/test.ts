import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Test endpoint called:', {
    method: req.method,
    headers: req.headers,
    url: req.url
  });

  if (req.method === 'GET') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  if (req.method === 'POST') {
    return res.json({ 
      status: 'ok', 
      method: 'POST',
      timestamp: new Date().toISOString(),
      headers: req.headers
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}