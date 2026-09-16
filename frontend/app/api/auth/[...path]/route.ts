import { NextRequest, NextResponse } from "next/server";

const DJANGO_BACKEND =
  process.env.DJANGO_BACKEND_URL || "http://127.0.0.1:8000";

async function proxyRequest(request: NextRequest, path: string[]) {
  const targetUrl = `${DJANGO_BACKEND}/api/auth/${path.join("/")}/`;

  const headers = new Headers();

  const contentType = request.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  const cookie = request.headers.get("cookie");

  if (cookie) {
    headers.set("cookie", cookie);
  }

  const csrfToken = request.headers.get("x-csrftoken");

  if (csrfToken) {
    headers.set("x-csrftoken", csrfToken);
  }

  const authorization = request.headers.get("authorization");

  if (authorization) {
    headers.set("authorization", authorization);
  }

  const method = request.method;

  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.text();

  try {
    const backendResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const responseBody = await backendResponse.text();

    const responseHeaders = new Headers();

    const responseContentType = backendResponse.headers.get("content-type");

    if (responseContentType) {
      responseHeaders.set("content-type", responseContentType);
    }

    const setCookie = backendResponse.headers.get("set-cookie");

    if (setCookie) {
      responseHeaders.set("set-cookie", setCookie);
    }

    return new NextResponse(responseBody, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to connect to the Django backend. Make sure Django is running on port 8000.",
      },
      {
        status: 502,
      },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ path: string[] }>;
  },
) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ path: string[] }>;
  },
) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{ path: string[] }>;
  },
) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ path: string[] }>;
  },
) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}
