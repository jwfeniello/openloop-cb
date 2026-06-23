import {  type NextRequest } from 'next/server'

// exactly mimics search params as they would be the same in teh backend
export async function GET(request: NextRequest): Promise<Response> {
  
  const backendUrl = process.env.BACKEND_URL || 'http://web:8000';
  const res = await fetch(`${backendUrl}/api/sample?format=json&` + request.nextUrl.searchParams.toString())
  console.log(res.body)
  const data = await res.json()
 
  return Response.json(data)
}