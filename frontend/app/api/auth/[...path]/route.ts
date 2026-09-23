const DJANGO_BACKEND =
  process.env.DJANGO_BACKEND_URL || "http://127.0.0.1:8000";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxyRequest(
  request: Request,
  path: string[],
): Promise<Response> {
  const backendBaseUrl = DJANGO_BACKEND.replace(/\/+$/, "");

  const normalizedPath = path
    .filter(Boolean)
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .join("/");

  const requestUrl = new URL(request.url);

  const targetUrl = `${backendBaseUrl}/api/auth/${normalizedPath}/${
    requestUrl.search
  }`;

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

  const accept = request.headers.get("accept");

  if (accept) {
    headers.set("accept", accept);
  }

  const method = request.method;

  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  try {
    const backendResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "follow",
    });

    const responseBody = await backendResponse.arrayBuffer();

    const responseHeaders = new Headers();

    const responseContentType = backendResponse.headers.get("content-type");

    if (responseContentType) {
      responseHeaders.set("content-type", responseContentType);
    }

    const contentDisposition = backendResponse.headers.get(
      "content-disposition",
    );

    if (contentDisposition) {
      responseHeaders.set("content-disposition", contentDisposition);
    }

    const cacheControl = backendResponse.headers.get("cache-control");

    if (cacheControl) {
      responseHeaders.set("cache-control", cacheControl);
    }

    /*
     * Forward Django's session cookies to the browser.
     */
    const setCookieHeaders =
      typeof backendResponse.headers.getSetCookie === "function"
        ? backendResponse.headers.getSetCookie()
        : [];

    for (const setCookie of setCookieHeaders) {
      responseHeaders.append("set-cookie", setCookie);
    }

    return new Response(responseBody, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Django proxy error:", error);

    return Response.json(
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

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}

export async function PUT(request: Request, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}
