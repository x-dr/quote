
      let global = globalThis;
      globalThis.global = globalThis;

      if (typeof global.navigator === 'undefined') {
        global.navigator = {
          userAgent: 'edge-runtime',
          language: 'en-US',
          languages: ['en-US'],
        };
      } else {
        if (typeof global.navigator.language === 'undefined') {
          global.navigator.language = 'en-US';
        }
        if (!global.navigator.languages || global.navigator.languages.length === 0) {
          global.navigator.languages = [global.navigator.language];
        }
        if (typeof global.navigator.userAgent === 'undefined') {
          global.navigator.userAgent = 'edge-runtime';
        }
      }

      class MessageChannel {
        constructor() {
          this.port1 = new MessagePort();
          this.port2 = new MessagePort();
        }
      }
      class MessagePort {
        constructor() {
          this.onmessage = null;
        }
        postMessage(data) {
          if (this.onmessage) {
            setTimeout(() => this.onmessage({ data }), 0);
          }
        }
      }
      global.MessageChannel = MessageChannel;

      // if ((typeof globalThis.fetch === 'undefined' || typeof globalThis.Headers === 'undefined' || typeof globalThis.Request === 'undefined' || typeof globalThis.Response === 'undefined') && typeof require !== 'undefined') {
      //   try {
      //     const undici = require('undici');
      //     if (undici.fetch && !globalThis.fetch) {
      //       globalThis.fetch = undici.fetch;
      //     }
      //     if (undici.Headers && typeof globalThis.Headers === 'undefined') {
      //       globalThis.Headers = undici.Headers;
      //     }
      //     if (undici.Request && typeof globalThis.Request === 'undefined') {
      //       globalThis.Request = undici.Request;
      //     }
      //     if (undici.Response && typeof globalThis.Response === 'undefined') {
      //       globalThis.Response = undici.Response;
      //     }
      //   } catch (polyfillError) {
      //     console.warn('Edge middleware polyfill failed:', polyfillError && polyfillError.message ? polyfillError.message : polyfillError);
      //   }
      // }

      '__MIDDLEWARE_BUNDLE_CODE__'

      function recreateRequest(request, overrides = {}) {
        const cloned = typeof request.clone === 'function' ? request.clone() : request;
        const headers = new Headers(cloned.headers);

        if (overrides.headerPatches) {
          Object.keys(overrides.headerPatches).forEach((key) => {
            const value = overrides.headerPatches[key];
            if (value === null || typeof value === 'undefined') {
              headers.delete(key);
            } else {
              headers.set(key, value);
            }
          });
        }

        if (overrides.headers) {
          const extraHeaders = new Headers(overrides.headers);
          extraHeaders.forEach((value, key) => headers.set(key, value));
        }

        const url = overrides.url || cloned.url;
        const method = overrides.method || cloned.method || 'GET';
        const canHaveBody = method && method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD';
        const body = overrides.body !== undefined ? overrides.body : canHaveBody ? cloned.body : undefined;

        // 如果rewrite传入的是完整URL（第三方地址），需要更新host
        if (overrides.url) {
          try {
            const newUrl = new URL(overrides.url, cloned.url);
            // 只有当新URL是绝对路径（包含协议和host）时才更新host
            if (overrides.url.startsWith('http://') || overrides.url.startsWith('https://')) {
              headers.set('host', newUrl.host);
            }
            // 相对路径时保持原有host不变
          } catch (e) {
            // URL解析失败时保持原有host
          }
        }

        const init = {
          method,
          headers,
          redirect: cloned.redirect,
          credentials: cloned.credentials,
          cache: cloned.cache,
          mode: cloned.mode,
          referrer: cloned.referrer,
          referrerPolicy: cloned.referrerPolicy,
          integrity: cloned.integrity,
          keepalive: cloned.keepalive,
          signal: cloned.signal,
        };

        if (canHaveBody && body !== undefined) {
          init.body = body;
        }

        if ('duplex' in cloned) {
          init.duplex = cloned.duplex;
        }

        return new Request(url, init);

      }

      

      async function handleRequest(context){
        let routeParams = {};
        let pagesFunctionResponse = null;
        let request = context.request;
        const waitUntil = context.waitUntil;
        let urlInfo = new URL(request.url);
        const eo = request.eo || {};

        const normalizePathname = () => {
          if (urlInfo.pathname !== '/' && urlInfo.pathname.endsWith('/')) {
            urlInfo.pathname = urlInfo.pathname.slice(0, -1);
          }
        };

        function getSuffix(pathname = '') {
          // Use a regular expression to extract the file extension from the URL
          const suffix = pathname.match(/.([^.]+)$/);
          // If an extension is found, return it, otherwise return an empty string
          return suffix ? '.' + suffix[1] : null;
        }

        normalizePathname();

        let matchedFunc = false;

        
        const runEdgeFunctions = () => {
          
          if(!matchedFunc && '/jdjygoldapi/api' === urlInfo.pathname) {
            matchedFunc = true;
              (() => {
  // functions/jdjygoldapi/api.js
  var DEFAULT_UPSTREAM = "https://api.jdjygold.com";
  var STOCK_UPSTREAM = "https://quoteapi.jd.com";
  var json = (payload, init = {}) => new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers || {}
    }
  });
  var buildCorsHeaders = (request) => {
    const origin = request.headers.get("Origin") || "*";
    const reqHeaders = request.headers.get("Access-Control-Request-Headers");
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": reqHeaders || "Content-Type, Authorization",
      Vary: "Origin"
    };
  };
  var extractTargetPath = (pathname) => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] !== "jdjygoldapi") {
      return "/";
    }
    const rest = segments[1] === "jdjygoldapi" ? segments.slice(2) : segments.slice(1);
    return `/${rest.join("/")}`;
  };
  var resolveUpstreamBase = (targetPath, env) => {
    if (targetPath.startsWith("/appstock/")) {
      return env?.STOCK_API_ORIGIN || STOCK_UPSTREAM;
    }
    return env?.BASE_API_ORIGIN || DEFAULT_UPSTREAM;
  };
  async function onRequest({ request, env }) {
    const corsHeaders = buildCorsHeaders(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    const incomingUrl = new URL(request.url);
    const targetPath = extractTargetPath(incomingUrl.pathname);
    const upstreamBase = resolveUpstreamBase(targetPath, env);
    if (targetPath === "/") {
      return json(
        {
          ok: true,
          message: "Cloudflare proxy is running"
        },
        { headers: corsHeaders }
      );
    }
    const upstreamUrl = new URL(targetPath + incomingUrl.search, upstreamBase);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.set("x-proxy-by", "cf-worker");
    const init = {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? void 0 : request.body,
      redirect: "follow"
    };
    try {
      const upstreamResp = await fetch(upstreamUrl.toString(), init);
      const respHeaders = new Headers(upstreamResp.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        respHeaders.set(k, v);
      });
      return new Response(upstreamResp.body, {
        status: upstreamResp.status,
        statusText: upstreamResp.statusText,
        headers: respHeaders
      });
    } catch (error) {
      return json(
        {
          message: "Proxy request failed",
          error: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 502, headers: corsHeaders }
      );
    }
  }

        pagesFunctionResponse = onRequest;
      })();
          }
        

          if(!matchedFunc && /^\/jdjygoldapi\/(.+?)$/.test(urlInfo.pathname)) {
            routeParams = {"id":"path","mode":2,"left":"/jdjygoldapi/"};
            matchedFunc = true;
            (() => {
  // functions/jdjygoldapi/api.js
  var DEFAULT_UPSTREAM = "https://api.jdjygold.com";
  var STOCK_UPSTREAM = "https://quoteapi.jd.com";
  var json = (payload, init = {}) => new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers || {}
    }
  });
  var buildCorsHeaders = (request) => {
    const origin = request.headers.get("Origin") || "*";
    const reqHeaders = request.headers.get("Access-Control-Request-Headers");
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": reqHeaders || "Content-Type, Authorization",
      Vary: "Origin"
    };
  };
  var extractTargetPath = (pathname) => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] !== "jdjygoldapi") {
      return "/";
    }
    const rest = segments[1] === "jdjygoldapi" ? segments.slice(2) : segments.slice(1);
    return `/${rest.join("/")}`;
  };
  var resolveUpstreamBase = (targetPath, env) => {
    if (targetPath.startsWith("/appstock/")) {
      return env?.STOCK_API_ORIGIN || STOCK_UPSTREAM;
    }
    return env?.BASE_API_ORIGIN || DEFAULT_UPSTREAM;
  };
  async function onRequest({ request, env }) {
    const corsHeaders = buildCorsHeaders(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    const incomingUrl = new URL(request.url);
    const targetPath = extractTargetPath(incomingUrl.pathname);
    const upstreamBase = resolveUpstreamBase(targetPath, env);
    if (targetPath === "/") {
      return json(
        {
          ok: true,
          message: "Cloudflare proxy is running"
        },
        { headers: corsHeaders }
      );
    }
    const upstreamUrl = new URL(targetPath + incomingUrl.search, upstreamBase);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.set("x-proxy-by", "cf-worker");
    const init = {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? void 0 : request.body,
      redirect: "follow"
    };
    try {
      const upstreamResp = await fetch(upstreamUrl.toString(), init);
      const respHeaders = new Headers(upstreamResp.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        respHeaders.set(k, v);
      });
      return new Response(upstreamResp.body, {
        status: upstreamResp.status,
        statusText: upstreamResp.statusText,
        headers: respHeaders
      });
    } catch (error) {
      return json(
        {
          message: "Proxy request failed",
          error: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 502, headers: corsHeaders }
      );
    }
  }

        pagesFunctionResponse = onRequest;
      })();
          }
        
        };
      

        let middlewareResponseHeaders = null;
        
        // 走到这里说明：
        // 1. 没有中间件响应（middlewareResponse 为 null/undefined）
        // 2. 或者中间件返回了 next
        // 需要判断是否命中边缘函数

        runEdgeFunctions();

        //没有命中边缘函数，执行回源
        if (!matchedFunc) {
          // 允许压缩的文件后缀白名单
          const ALLOW_COMPRESS_SUFFIXES = [
            '.html', '.htm', '.xml', '.txt', '.text', '.conf', '.def', '.list', '.log', '.in',
            '.css', '.js', '.json', '.rss', '.svg', '.tif', '.tiff', '.rtx', '.htc',
            '.java', '.md', '.markdown', '.ico', '.pl', '.pm', '.cgi', '.pb', '.proto',
            '.xhtml', '.xht', '.ttf', '.otf', '.woff', '.eot', '.wasm', '.binast', '.webmanifest'
          ];
          
          // 检查请求路径是否有允许压缩的后缀
          const pathname = urlInfo.pathname;
          const suffix = getSuffix(pathname);
          const hasCompressibleSuffix = ALLOW_COMPRESS_SUFFIXES.includes(suffix);
          
          // 如果不是可压缩的文件类型，删除 Accept-Encoding 头以禁用 CDN 压缩
          if (!hasCompressibleSuffix) {
              request.headers.delete('accept-encoding');
          }
          
          const originResponse = await fetch(request);
          
          // 如果中间件设置了响应头，合并到回源响应中
          if (middlewareResponseHeaders) {
            const mergedHeaders = new Headers(originResponse.headers);
            // 删除可能导致问题的编码相关头
            mergedHeaders.delete('content-encoding');
            mergedHeaders.delete('content-length');
            middlewareResponseHeaders.forEach((value, key) => {
              if (key.toLowerCase() === 'set-cookie') {
                mergedHeaders.append(key, value);
              } else {
                mergedHeaders.set(key, value);
              }
            });
            return new Response(originResponse.body, {
              status: originResponse.status,
              statusText: originResponse.statusText,
              headers: mergedHeaders,
            });
          }
          
          return originResponse;
        }
        
        // 命中了边缘函数，继续执行边缘函数逻辑

        const params = {};
        if (routeParams.id) {
          if (routeParams.mode === 1) {
            const value = urlInfo.pathname.match(routeParams.left);        
            for (let i = 1; i < value.length; i++) {
              params[routeParams.id[i - 1]] = value[i];
            }
          } else {
            const value = urlInfo.pathname.replace(routeParams.left, '');
            const splitedValue = value.split('/');
            if (splitedValue.length === 1) {
              params[routeParams.id] = splitedValue[0];
            } else {
              params[routeParams.id] = splitedValue;
            }
          }
          
        }
        const edgeFunctionResponse = await pagesFunctionResponse({request, params, env: {"FORCE_COLOR":"true","_":"/root/.nvm/versions/node/v24.14.1/bin/edgeone","VSCODE_IPC_HOOK_CLI":"/run/user/0/vscode-ipc-84290f93-a68c-4d02-baf5-51b53e7528a4.sock","TERM_PROGRAM":"vscode","MOTD_SHOWN":"pam","LOGNAME":"root","HOME":"/root","VSCODE_GIT_ASKPASS_NODE":"/root/.vscode-server/cli/servers/Stable-10c8e557c8b9f9ed0a87f61f1c9a44bde731c409/server/node","XDG_SESSION_TYPE":"tty","NVM_CD_FLAGS":"","SSH_CONNECTION":"192.168.1.103 11578 192.168.1.35 22","LANG":"en_US.UTF-8","PWD":"/root/quote","TERM":"xterm-256color","TERM_PROGRAM_VERSION":"1.117.0","COLORTERM":"truecolor","SHELL":"/bin/bash","VSCODE_GIT_ASKPASS_EXTRA_ARGS":"","GIT_ASKPASS":"/root/.vscode-server/cli/servers/Stable-10c8e557c8b9f9ed0a87f61f1c9a44bde731c409/server/extensions/git/dist/askpass.sh","VSCODE_PYTHON_AUTOACTIVATE_GUARD":"1","XDG_SESSION_CLASS":"user","BROWSER":"/root/.vscode-server/cli/servers/Stable-10c8e557c8b9f9ed0a87f61f1c9a44bde731c409/server/bin/helpers/browser.sh","VSCODE_GIT_IPC_HANDLE":"/run/user/0/vscode-git-5b2abc3678.sock","USER":"root","SHLVL":"1","NVM_BIN":"/root/.nvm/versions/node/v24.14.1/bin","XDG_SESSION_ID":"c27","XDG_RUNTIME_DIR":"/run/user/0","VSCODE_GIT_ASKPASS_MAIN":"/root/.vscode-server/cli/servers/Stable-10c8e557c8b9f9ed0a87f61f1c9a44bde731c409/server/extensions/git/dist/askpass-main.js","NVM_DIR":"/root/.nvm","SSH_CLIENT":"192.168.1.103 11578 22","NVM_INC":"/root/.nvm/versions/node/v24.14.1/include/node","PATH":"/root/.vscode-server/data/User/globalStorage/github.copilot-chat/debugCommand:/root/.vscode-server/data/User/globalStorage/github.copilot-chat/copilotCli:/root/.vscode-server/cli/servers/Stable-10c8e557c8b9f9ed0a87f61f1c9a44bde731c409/server/bin/remote-cli:/root/.nvm/versions/node/v24.14.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"}, waitUntil, eo });
        
        // 如果中间件设置了响应头，合并到边缘函数响应中
        if (middlewareResponseHeaders && edgeFunctionResponse) {
          const mergedHeaders = new Headers(edgeFunctionResponse.headers);
          // 删除可能导致问题的编码相关头
          mergedHeaders.delete('content-encoding');
          mergedHeaders.delete('content-length');
          middlewareResponseHeaders.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
              mergedHeaders.append(key, value);
            } else {
              mergedHeaders.set(key, value);
            }
          });
          return new Response(edgeFunctionResponse.body, {
            status: edgeFunctionResponse.status,
            statusText: edgeFunctionResponse.statusText,
            headers: mergedHeaders,
          });
        }
        
        return edgeFunctionResponse;
      }
      addEventListener('fetch', event=>{return event.respondWith(handleRequest({request:event.request,params: {}, env: {"FORCE_COLOR":"true","_":"/root/.nvm/versions/node/v24.14.1/bin/edgeone","VSCODE_IPC_HOOK_CLI":"/run/user/0/vscode-ipc-84290f93-a68c-4d02-baf5-51b53e7528a4.sock","TERM_PROGRAM":"vscode","MOTD_SHOWN":"pam","LOGNAME":"root","HOME":"/root","VSCODE_GIT_ASKPASS_NODE":"/root/.vscode-server/cli/servers/Stable-10c8e557c8b9f9ed0a87f61f1c9a44bde731c409/server/node","XDG_SESSION_TYPE":"tty","NVM_CD_FLAGS":"","SSH_CONNECTION":"192.168.1.103 11578 192.168.1.35 22","LANG":"en_US.UTF-8","PWD":"/root/quote","TERM":"xterm-256color","TERM_PROGRAM_VERSION":"1.117.0","COLORTERM":"truecolor","SHELL":"/bin/bash","VSCODE_GIT_ASKPASS_EXTRA_ARGS":"","GIT_ASKPASS":"/root/.vscode-server/cli/servers/Stable-10c8e557c8b9f9ed0a87f61f1c9a44bde731c409/server/extensions/git/dist/askpass.sh","VSCODE_PYTHON_AUTOACTIVATE_GUARD":"1","XDG_SESSION_CLASS":"user","BROWSER":"/root/.vscode-server/cli/servers/Stable-10c8e557c8b9f9ed0a87f61f1c9a44bde731c409/server/bin/helpers/browser.sh","VSCODE_GIT_IPC_HANDLE":"/run/user/0/vscode-git-5b2abc3678.sock","USER":"root","SHLVL":"1","NVM_BIN":"/root/.nvm/versions/node/v24.14.1/bin","XDG_SESSION_ID":"c27","XDG_RUNTIME_DIR":"/run/user/0","VSCODE_GIT_ASKPASS_MAIN":"/root/.vscode-server/cli/servers/Stable-10c8e557c8b9f9ed0a87f61f1c9a44bde731c409/server/extensions/git/dist/askpass-main.js","NVM_DIR":"/root/.nvm","SSH_CLIENT":"192.168.1.103 11578 22","NVM_INC":"/root/.nvm/versions/node/v24.14.1/include/node","PATH":"/root/.vscode-server/data/User/globalStorage/github.copilot-chat/debugCommand:/root/.vscode-server/data/User/globalStorage/github.copilot-chat/copilotCli:/root/.vscode-server/cli/servers/Stable-10c8e557c8b9f9ed0a87f61f1c9a44bde731c409/server/bin/remote-cli:/root/.nvm/versions/node/v24.14.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"}, waitUntil: event.waitUntil.bind(event) }))});