const TARGETS = {
  queryStallNew: {
    url: "https://api.jdjygold.com/gw2/generic/6440/h5/m/queryStallForGold",
    methods: ["POST"],
  },
  stockFormat: {
    url: "https://quoteapi.jd.com/appstock/app/q/qt/simple/query/format",
    methods: ["POST"],
  },
  cfGetSimpleQuote: {
    url: "https://api.jdjygold.com/gw/generic/hj/h5/m/cfGetSimpleQuote",
    methods: ["POST"],
  },
  cfGetKlineInfo: {
    url: "https://api.jdjygold.com/gw/generic/hj/h5/m/cfGetKlineInfo",
    methods: ["POST"],
  },
  cfGetMinKlineInfo: {
    url: "https://api.jdjygold.com/gw/generic/hj/h5/m/cfGetMinKlineInfo",
    methods: ["POST"],
  },
  cfgetTimeSharingDots: {
    url: "https://api.jdjygold.com/gw/generic/hj/h5/m/cfgetTimeSharingDots",
    methods: ["POST"],
  },
  getRangeTimeSharingDotsByNums: {
    url: "https://api.jdjygold.com/gw/generic/hj/h5/m/getRangeTimeSharingDotsByNums",
    methods: ["POST"],
  },
  homeFeedFlow: {
    url: "https://api.jdjygold.com/gw/generic/jimu/h5/m/homeFeedFlow",
    methods: ["POST"],
  },
};

const COMPATIBLE_PATHS = {
  "/queryStallNew": "queryStallNew",
  "/stockFormat": "stockFormat",
  "/cfGetSimpleQuote": "cfGetSimpleQuote",
  "/cfGetKlineInfo": "cfGetKlineInfo",
  "/cfGetMinKlineInfo": "cfGetMinKlineInfo",
  "/cfgetTimeSharingDots": "cfgetTimeSharingDots",
  "/getRangeTimeSharingDotsByNums": "getRangeTimeSharingDotsByNums",
  "/homeFeedFlow": "homeFeedFlow",
  "/gw2/generic/6440/h5/m/queryStallForGold": "queryStallNew",
  "/appstock/app/q/qt/simple/query/format": "stockFormat",
  "/gw/generic/hj/h5/m/cfGetSimpleQuote": "cfGetSimpleQuote",
  "/gw/generic/hj/h5/m/cfGetKlineInfo": "cfGetKlineInfo",
  "/gw/generic/hj/h5/m/cfGetMinKlineInfo": "cfGetMinKlineInfo",
  "/gw/generic/hj/h5/m/cfgetTimeSharingDots": "cfgetTimeSharingDots",
  "/gw/generic/hj/h5/m/getRangeTimeSharingDotsByNums": "getRangeTimeSharingDotsByNums",
  "/gw/generic/jimu/h5/m/homeFeedFlow": "homeFeedFlow",
};

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-requested-with",
};

function withCorsHeaders(headers = {}) {
  return {
    ...headers,
    ...CORS_HEADERS,
  };
}

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: withCorsHeaders({
      "content-type": "application/json; charset=utf-8",
      ...headers,
    }),
  });
}

function getRouteName(pathname) {
  const segments = pathname.replace(/^\/+|\/+$/g, "").split("/");
  return segments[segments.length - 1] || "";
}

function getTargetFromPath(pathname) {
  const cleanPath = pathname.replace(/\/+$/g, "") || "/";
  const cleanPathWithoutApiPrefix = cleanPath.replace(/^\/api(?=\/|$)/, "") || "/";

  const byExactPath = COMPATIBLE_PATHS[cleanPath];
  if (byExactPath && TARGETS[byExactPath]) {
    return { routeName: byExactPath, target: TARGETS[byExactPath] };
  }

  const byExactPathWithoutApiPrefix = COMPATIBLE_PATHS[cleanPathWithoutApiPrefix];
  if (byExactPathWithoutApiPrefix && TARGETS[byExactPathWithoutApiPrefix]) {
    return { routeName: byExactPathWithoutApiPrefix, target: TARGETS[byExactPathWithoutApiPrefix] };
  }

  const byLastSegment = getRouteName(cleanPath);
  if (TARGETS[byLastSegment]) {
    return { routeName: byLastSegment, target: TARGETS[byLastSegment] };
  }

  return { routeName: byLastSegment, target: null };
}

function buildUpstreamUrl(baseUrl, reqUrl) {
  const upstream = new URL(baseUrl);
  if (reqUrl.search) {
    upstream.search = reqUrl.search;
  }
  return upstream.toString();
}

function buildForwardHeaders(request) {
  const headers = new Headers();
  const passthroughHeaders = ["content-type", "authorization", "accept", "user-agent", "referer"];
  for (const key of passthroughHeaders) {
    const val = request.headers.get(key);
    if (val) headers.set(key, val);
  }
  return headers;
}

export async function onRequest(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: withCorsHeaders(),
    });
  }

  const { routeName, target } = getTargetFromPath(reqUrl.pathname);

  if (!target) {
    return jsonResponse(
      {
        code: 404,
        message: `Unknown proxy route: ${routeName}`,
        availableRoutes: Object.keys(COMPATIBLE_PATHS),
      },
      404
    );
  }

  if (!target.methods.includes(request.method)) {
    return jsonResponse(
      {
        code: 405,
        message: `Method ${request.method} is not allowed for route ${routeName}`,
        allow: target.methods,
      },
      405,
      { allow: target.methods.join(",") }
    );
  }

  const upstreamUrl = buildUpstreamUrl(target.url, reqUrl);
  const init = {
    method: request.method,
    headers: buildForwardHeaders(request),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, init);
    const responseHeaders = new Headers(upstreamRes.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(k, v);
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return jsonResponse(
      {
        code: 502,
        message: "Proxy request failed",
        detail: error?.message || String(error),
      },
      502
    );
  }
}
