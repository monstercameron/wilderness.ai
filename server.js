const http = require("http");
const fs = require("fs");
const path = require("path");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 8080);
const root = __dirname;
const cerebrasModel = "gemma-4-31b";
const cerebrasEndpoint = "https://api.cerebras.ai/v1/chat/completions";
let cerebrasApiKey = process.env.CEREBRAS_API_KEY?.trim() || null;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const securityHeaders = {
  "Cache-Control": "no-store",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    ...securityHeaders,
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

const readJsonBody = (request, maxBytes = 64 * 1024) =>
  new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > maxBytes) {
        reject(new Error("Request body is too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    request.on("error", reject);
  });

const isAllowedOrigin = (request) => {
  const origin = request.headers.origin;
  return !origin || origin === `http://${host}:${port}`;
};

const decisionSchema = {
  type: "object",
  properties: {
    direction: {
      type: "string",
      enum: ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "STAY"],
    },
    action: {
      type: "string",
      enum: ["move", "explore", "forage", "drink", "flee", "sacrifice", "stalk", "attack", "rest"],
    },
    intent: {
      type: "string",
      enum: ["ORIENT", "FORAGE", "SEEK_WATER", "REST", "FLEE", "BREAKOUT", "RECOVER", "TRACK", "STALK", "ATTACK", "DRINK", "GIVE_UP"],
    },
    target: {
      type: "object",
      properties: {
        x: { type: "integer" },
        y: { type: "integer" },
      },
      required: ["x", "y"],
      additionalProperties: false,
    },
    thought: { type: "string" },
    reason: { type: "string" },
    acceptedTradeoff: { type: "string" },
  },
  required: ["direction", "action", "intent", "target", "thought", "reason", "acceptedTradeoff"],
  additionalProperties: false,
};

const normalizeDecision = (decision) => {
  const validDirections = new Set(decisionSchema.properties.direction.enum);
  const validActions = new Set(decisionSchema.properties.action.enum);
  const validIntents = new Set(decisionSchema.properties.intent.enum);
  if (
    !decision ||
    !validDirections.has(decision.direction) ||
    !validActions.has(decision.action) ||
    !validIntents.has(decision.intent) ||
    !Number.isInteger(decision.target?.x) ||
    !Number.isInteger(decision.target?.y)
  ) {
    throw new Error("The model returned an invalid animal decision");
  }

  return {
    direction: decision.direction,
    action: decision.action,
    intent: decision.intent,
    target: {
      x: decision.target.x,
      y: decision.target.y,
    },
    thought: String(decision.thought || "I need a moment to understand this place.").slice(0, 180),
    reason: String(decision.reason || "Decision returned by Cerebras.").slice(0, 260),
    acceptedTradeoff: String(decision.acceptedTradeoff || "No exceptional tradeoff accepted.").slice(0, 180),
  };
};

const requestCerebrasDecision = async (snapshot) => {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 12000);
  const startedAt = Date.now();

  try {
    const apiResponse = await fetch(cerebrasEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cerebrasApiKey}`,
        "Content-Type": "application/json",
        "X-Cerebras-Version-Patch": "2",
      },
      body: JSON.stringify({
        model: cerebrasModel,
        messages: [
          {
            role: "system",
            content:
              "You direct one autonomous animal per turn in a wilderness simulation. Return one allowed intent, action, either STAY or an allowed adjacent direction, the exact grid target, and the tradeoff accepted. Treat the supplied weighted state machine as decision support: compare its priorities, allowed transitions, actual threat range, and fear-corrupted perception. Fear may distort salience, so do not blindly trust corrupted distance; immediate actual danger still dominates. BREAKOUT and sacrifice are reserved for cornered or imminent contact and deliberately cost health plus stamina. Respect physiology, map, and role. Never enter trees or invent unseen facts. Write the animal's thought in first person and keep all prose concise.",
          },
          {
            role: "user",
            content: JSON.stringify(snapshot),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "animal_decision",
            strict: true,
            schema: decisionSchema,
          },
        },
        temperature: 0.25,
        max_completion_tokens: 220,
        stream: false,
      }),
      signal: abortController.signal,
    });

    const payload = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) {
      const message = payload?.error?.message || `Cerebras returned HTTP ${apiResponse.status}`;
      const error = new Error(String(message).slice(0, 240));
      error.statusCode = apiResponse.status === 401 ? 401 : 502;
      throw error;
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Cerebras returned no decision content");

    return {
      decision: normalizeDecision(JSON.parse(content)),
      model: payload.model || cerebrasModel,
      latencyMs: Date.now() - startedAt,
      usage: payload.usage
        ? {
            promptTokens: payload.usage.prompt_tokens,
            completionTokens: payload.usage.completion_tokens,
            totalTokens: payload.usage.total_tokens,
          }
        : null,
    };
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Cerebras inference timed out");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const handleApiRequest = async (request, response, pathname) => {
  if (!isAllowedOrigin(request)) {
    sendJson(response, 403, { error: "Origin not allowed" });
    return true;
  }

  if (pathname === "/api/inference/status" && request.method === "GET") {
    sendJson(response, 200, {
      configured: Boolean(cerebrasApiKey),
      model: cerebrasModel,
      storage: "memory",
    });
    return true;
  }

  if (pathname === "/api/inference/config" && request.method === "POST") {
    const body = await readJsonBody(request, 4 * 1024);
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (apiKey.length < 20 || apiKey.length > 512) {
      sendJson(response, 400, { error: "Enter a valid Cerebras API key" });
      return true;
    }

    cerebrasApiKey = apiKey;
    sendJson(response, 200, { configured: true, model: cerebrasModel, storage: "memory" });
    return true;
  }

  if (pathname === "/api/inference/config" && request.method === "DELETE") {
    cerebrasApiKey = null;
    sendJson(response, 200, { configured: false, model: cerebrasModel });
    return true;
  }

  if (pathname === "/api/inference/decision" && request.method === "POST") {
    if (!cerebrasApiKey) {
      sendJson(response, 401, { error: "Cerebras is not configured" });
      return true;
    }

    const body = await readJsonBody(request);
    if (!body.snapshot || typeof body.snapshot !== "object") {
      sendJson(response, 400, { error: "A simulation snapshot is required" });
      return true;
    }

    const result = await requestCerebrasDecision(body.snapshot);
    sendJson(response, 200, result);
    return true;
  }

  return false;
};

const serveStaticFile = (request, response, pathname) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, requestedPath);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(response, error.code === "ENOENT" ? 404 : 500, { error: "Not found" });
      return;
    }

    response.writeHead(200, {
      ...securityHeaders,
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
    });
    if (request.method === "HEAD") response.end();
    else response.end(data);
  });
};

const server = http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);

  try {
    const handled = pathname.startsWith("/api/")
      ? await handleApiRequest(request, response, pathname)
      : false;
    if (!handled) serveStaticFile(request, response, pathname);
  } catch (error) {
    const statusCode = Number(error.statusCode) || 500;
    sendJson(response, statusCode, {
      error: statusCode === 500 ? "Inference request failed" : error.message,
      detail: statusCode === 502 ? error.message : undefined,
    });
  }
});

server.listen(port, host, () => {
  console.log(`Wilderness.ai is running at http://${host}:${port}`);
  console.log(
    cerebrasApiKey
      ? `Cerebras ${cerebrasModel} is configured from the environment`
      : "Cerebras key will be held in memory after local setup"
  );
});
