import {  type NextRequest } from 'next/server'
  
  // export an async GET function. This is a convention in NextJS
  export async function GET(request: NextRequest): Promise<Response> {
    // filename for the file that the user is trying to download
    const filename = request.nextUrl.searchParams.get('file')
    const pack = request.nextUrl.searchParams.get('pack')
    const category = request.nextUrl.searchParams.get('category')

    // external file URL
    const backendUrl = process.env.BACKEND_URL || 'http://web:8000';
    const BUILT_URL =
      `${backendUrl}/media/uploads/` + pack + "/Sounds/" + category + '/' + filename;
  
    // use fetch to get a response
    const response = await fetch(BUILT_URL)

    // return a new response but use 'content-disposition' to suggest saving the file to the user's computer
    return new Response(response.body, {
      headers: {
        ...response.headers, // copy the previous headers
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  }
  