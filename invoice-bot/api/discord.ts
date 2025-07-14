import {
  InteractionType,
  InteractionResponseType
} from 'discord-api-types/v10';

export default async function handler(req: any, res: any) {
  console.log('🚀 Handler called:', req.method, req.headers);
  
  // Discord PING test
  if (req.method === 'POST') {
    console.log('📨 Body:', req.body);
    
    // Check if it's a PING
    if (req.body && req.body.type === InteractionType.Ping) {
      console.log('🏓 Responding to PING');
      return res.status(200).json({ type: InteractionResponseType.Pong });
    }
    
    // For any other POST, return OK
    return res.status(200).json({ message: 'OK', body: req.body });
  }
  
  // For non-POST methods
  return res.status(405).json({ error: 'Method not allowed' });
}