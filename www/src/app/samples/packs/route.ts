import { type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const backendUrl = process.env.BACKEND_URL || 'http://web:8000';
  const res = await fetch(`${backendUrl}/api/pack?format=json`)
  const data = await res.json()
  return Response.json(data)
}
