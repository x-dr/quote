import { onRequest as proxyOnRequest } from "./[[default]].js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.pathname === "/api" || url.pathname === "/api/") {
    return new Response(
      JSON.stringify({
        ok: true,
        message: "API proxy is ready",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "access-control-allow-origin": "*",
        },
      }
    );
  }

  return proxyOnRequest(context);
}
  