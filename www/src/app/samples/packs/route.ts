import { type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const backendUrl = process.env.BACKEND_URL || 'http://web:8000';
  const url = `${backendUrl}/api/pack?format=json`;
  
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Backend API error (${res.status}) on ${url}:`, errorText);
      return new Response(JSON.stringify({ 
        error: `Backend API error: ${res.status}`, 
        details: errorText.slice(0, 500) 
      }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error(`Fetch to backend failed on ${url}:`, error);
    return new Response(JSON.stringify({ 
      error: 'Failed to connect to backend API', 
      details: String(error) 
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
