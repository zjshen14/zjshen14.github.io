---
title: "Remote Agent Hosting: Setting Up OpenCode Web IDE with HTTP Proxy & Meta MuseSpark 1.3 Free Quota"
description: "A practical guide from our agent hosting project: how to self-host OpenCode Web IDE with reverse proxy and WebSockets, leverage Meta's MuseSpark 1.3 developer free quota, and achieve seamless multi-device coding from laptop to phone."
pubDate: 2026-09-26
tags: ["ai", "agent", "opencode", "musespark", "meta", "web-ide", "tutorial"]
draft: false
---

In our recent **Agent Hosting** project, we encountered a universal developer dilemma: **How can we give autonomous AI agents a dedicated, 24/7 environment that doesn't depend on a single local laptop, while remaining instantly accessible from any browser on any device?**

Running long-horizon agents locally has obvious bottlenecks:
- Close your laptop lid, and a 40-minute agent workflow terminates mid-execution.
- While on the go, if you want to inspect agent progress or tweak prompts, you rarely have your full development toolchain installed on your mobile phone or lightweight tablet.
- API keys, dependencies, and environment configurations quickly drift across multiple devices.

To overcome this, we built a remote cloud setup around **OpenCode Web IDE**, secured with an **HTTP / WebSocket reverse proxy**. Even better, Meta's latest frontier agent model—**MuseSpark 1.3 (Muse Spark 1.3)**—offers a generous **Free Quota (Developer / Contributor Tier)**. Tailor-made for multi-step agentic execution with a massive **1-million-token context window**, MuseSpark 1.3 slashes token overhead by ~25% and tool calls by ~20% compared to previous generations, allowing you to run agent prototypes and coding workflows at virtually zero marginal cost.

Here is the architectural overview and step-by-step blueprint so you can set up your own persistent agent playground on any VPS or cloud server.

---

## Architecture Overview

The system architecture is lean and battle-tested:

```text
[ Laptop / Phone / Tablet ] (Any modern browser)
           │
           │ HTTPS / WSS (TLS encrypted)
           ▼
[ Cloud VPS / Dedicated Server ]
     ├── Reverse Proxy (Nginx or Caddy with SSL + WebSocket support)
     │         │
     │         ▼ Local forwarding (127.0.0.1:8080)
     └── OpenCode Web IDE Service
               │
               ▼ Tool invocations & reasoning
     [ Meta MuseSpark 1.3 API (1M Context / Developer Free Quota) ]
```

### Why Do We Need an HTTP / WebSocket Reverse Proxy?
Running a modern Web IDE in the browser requires more than simple static HTTP request handling:
1. **Persistent WebSocket Streams**: The interactive terminal, Language Server Protocol (LSP) diagnostics, and real-time agent output streams rely entirely on WebSocket connections. Without proper proxy upgrade headers, browser terminals fail with instant connection drops.
2. **TLS / HTTPS Encryption**: Exposing code and session tokens over raw HTTP is a severe security hazard. Furthermore, modern browser features (such as the asynchronous Clipboard API and Service Workers) are strictly blocked on non-secure origins.
3. **Single Gatekeeper**: Keeping OpenCode bound exclusively to `127.0.0.1` ensures that no raw internal ports are reachable directly from the internet.

---

## Step 1: Launch OpenCode on the Server

On your Linux server (Ubuntu, Debian, or similar), install and run OpenCode.

Ensure OpenCode binds only to **`127.0.0.1`**:

```bash
# Start OpenCode bound to localhost on port 8080
opencode serve --host 127.0.0.1 --port 8080 --workspace /home/ubuntu/workspace
```

To ensure it runs continuously in the background and recovers gracefully from server reboots, create a **systemd** service:

```ini
# /etc/systemd/system/opencode.service
[Unit]
Description=OpenCode Web IDE Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/workspace
ExecStart=/usr/local/bin/opencode serve --host 127.0.0.1 --port 8080
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now opencode
sudo systemctl status opencode
```

---

## Step 2: Configure the Reverse Proxy (HTTP & WebSocket)

We need a reverse proxy to terminate SSL certificates and route traffic to OpenCode. Two great choices are **Caddy** (zero-config automated TLS) and **Nginx** (industry standard with granular controls).

### Option A: Using Caddy (Recommended for Simplicity)
Caddy automatically provisions and renews Let's Encrypt certificates without external cron jobs:

```text
# /etc/caddy/Caddyfile
ide.yourdomain.com {
    reverse_proxy 127.0.0.1:8080
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

### Option B: Using Nginx (Standard Production Setup)
If your server already runs Nginx, configure the virtual host as follows:

```nginx
# /etc/nginx/sites-available/opencode.conf
server {
    listen 80;
    server_name ide.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ide.yourdomain.com;

    # SSL Certificate Paths
    ssl_certificate /etc/letsencrypt/live/ide.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ide.yourdomain.com/privkey.pem;

    # Accommodate large asset uploads and long-running agent tasks
    client_max_body_size 100M;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;

    location / {
        proxy_pass http://127.0.0.1:8080;

        # Crucial for Web IDE Terminal & LSP WebSockets
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forward Client Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Validate and reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

You can now open `https://ide.yourdomain.com` in your browser to access the Web IDE securely.

---

## Step 3: Plugging in Meta MuseSpark 1.3 Developer Free Quota

An agent workspace is only as capable as the models driving it.

Released in September 2026, **Meta's MuseSpark 1.3** is specifically engineered for long-horizon autonomous tasks and coding workflows:
- **Agentic Resilience**: Handles multi-step planning within a single persistent thread, autonomously discovering missing context and invoking tools.
- **Superior Efficiency**: Consumes ~25% fewer tokens and requires ~20% fewer tool invocations on coding benchmarks compared to Muse 1.2.
- **1-Million Context Window**: Accommodates entire codebases, docs, and sprawling execution traces without truncation.
- **Developer Free Quota**: Available across Meta Model API, Muse Code, and community model gateways, the free developer tier makes it easy to validate agents before incurring infrastructure costs.

### 1. Obtain Your MuseSpark 1.3 Credentials
- Sign up on the developer portal (or your preferred Model API router).
- Navigate to **MuseSpark 1.3** to claim your developer tier access and copy your `API_KEY`.

### 2. Configure Environment Variables
Inside your workspace on the OpenCode server, store your credentials in a `.env` file or export them into your shell:

```bash
# Meta MuseSpark 1.3 Model Configuration
LLM_PROVIDER="meta"
LLM_MODEL="meta/muse-spark-1.3"
MUSE_SPARK_API_KEY="your-musespark-api-key-here"
MUSE_SPARK_BASE_URL="https://api.meta.ai/v1"
```

Verify your setup by running a simple Python snippet directly in OpenCode's integrated terminal:

```python
import os
import requests

api_key = os.getenv("MUSE_SPARK_API_KEY")
base_url = os.getenv("MUSE_SPARK_BASE_URL", "https://api.meta.ai/v1")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": "meta/muse-spark-1.3",
    "messages": [
        {"role": "user", "content": "Hello MuseSpark 1.3! You are running inside our hosted OpenCode Web IDE. Please confirm your agentic capabilities."}
    ],
    "temperature": 0.2
}

response = requests.post(f"{base_url}/chat/completions", json=payload, headers=headers)
print("MuseSpark 1.3 Response:", response.json()["choices"][0]["message"]["content"])
```

Seeing the response confirmed in your terminal verifies that your model pipeline is active.

---

## Step 4: Multi-Device Workflow: Phone + Laptop Synergy

Once configured, the real superpower is seamless mobility:

1. **Primary Workspace (Laptop)**:
   Open `https://ide.yourdomain.com` in Chrome or Safari. You get full code editing, syntax highlighting, git staging, and diff inspection just like a native desktop IDE.
2. **Headless Agent Runs (Server-Side)**:
   Launch background agents, test suites, or documentation scrapers inside the server terminal. Shut your laptop lid and go to sleep—the agent continues executing uninterrupted.
3. **Mobile Inspections (Phone / Tablet)**:
   While commuting, open the same URL on your smartphone. You can review git logs, read generated code, or send quick follow-up prompts without needing a laptop bag.

---

## Summary & Best Practices

Combining **OpenCode + WebSocket Reverse Proxy + Meta MuseSpark 1.3 Free Quota** provides a modern, cost-efficient, 24/7 autonomous agent workbench.

A few quick takeaways:
- **Enforce Strong Authentication**: Because a Web IDE grants full terminal execution rights on your server, always protect it with a strong password or HTTP Basic Auth at the reverse proxy layer.
- **Leverage the 1M Window Wisely**: While MuseSpark 1.3 handles 1M tokens with ease, good prompt hygiene and selective tool caching ensure you stay within your free developer quotas comfortably.

Give it a spin on your server! If you run into any WebSocket connection quirks or proxy issues, feel free to reach out or connect on social platforms.
