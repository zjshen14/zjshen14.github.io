---
title: "Remote Agent Hosting: Setting Up OpenCode Web IDE with HTTP Proxy & Spark 1.3 Free Quota"
description: "A practical guide from our agent hosting project: how to self-host OpenCode Web IDE with reverse proxy and WebSockets, leverage Spark 1.3 developer free quota, and achieve seamless multi-device coding from laptop to phone."
pubDate: 2026-09-26
tags: ["ai", "agent", "opencode", "spark", "web-ide", "tutorial"]
draft: false
---

In our recent **Agent Hosting** project, we encountered a universal developer dilemma: **How can we give autonomous AI agents a dedicated, 24/7 environment that doesn't depend on a single local laptop, while remaining instantly accessible from any browser on any device?**

Running long-horizon agents locally has obvious bottlenecks:
- Close your laptop lid, and a 40-minute agent workflow terminates mid-execution.
- While on the go, if you want to inspect agent progress or tweak prompts, you rarely have your full development toolchain installed on your mobile phone or lightweight tablet.
- API keys, dependencies, and environment configurations quickly drift across multiple devices.

To overcome this, we built a remote cloud setup around **OpenCode Web IDE**, secured with an **HTTP / WebSocket reverse proxy**. Even better, **Spark 1.3 (Developer Edition)** currently offers a generous **Free Quota** for developers, allowing you to run agent prototypes and coding workflows at virtually zero marginal cost.

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
     [ Spark 1.3 LLM API (Developer Free Quota) ]
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

## Step 3: Plugging in Spark 1.3 Developer Free Quota

An agent workspace is only as capable as the models driving it.

**Spark 1.3** is currently offering a generous **Developer Free Quota**. For developers running coding experiments, agentic evaluations, or local tool pipelines, this free tier eliminates the friction of racking up unexpected cloud model bills.

### 1. Obtain Your Spark 1.3 Credentials
- Register in the developer portal and complete developer verification.
- Create an application project and navigate to **Spark 1.3 Developer Edition**.
- Claim the developer free quota tier and copy your `APIKey` and `APISecret` (or unified Bearer Token).

### 2. Configure Environment Variables
Inside your workspace on the OpenCode server, store your credentials in a `.env` file or export them into your shell:

```bash
# Spark 1.3 Model Configuration
SPARK_API_VERSION=v1.3
SPARK_API_KEY="your-spark-api-key-here"
SPARK_API_SECRET="your-spark-api-secret-here"
SPARK_BASE_URL="https://spark-api-open.xf-yun.com/v1"
```

Verify your setup by running a simple Python snippet directly in OpenCode's integrated terminal:

```python
import os
import requests

api_key = os.getenv("SPARK_API_KEY")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": "spark-1.3",
    "messages": [
        {"role": "user", "content": "Hello Spark 1.3! You are running inside OpenCode Web IDE."}
    ]
}

response = requests.post("https://spark-api-open.xf-yun.com/v1/chat/completions", json=payload, headers=headers)
print("Spark 1.3 Response:", response.json()["choices"][0]["message"]["content"])
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

Combining **OpenCode + WebSocket Reverse Proxy + Spark 1.3 Free Quota** provides a modern, cost-efficient, 24/7 autonomous agent workbench.

A few quick takeaways:
- **Enforce Strong Authentication**: Because a Web IDE grants full terminal execution rights on your server, always protect it with a strong password or HTTP Basic Auth at the reverse proxy layer.
- **Capitalize on Free Developer Quotas**: Take advantage of developer tiers like Spark 1.3 to prototype agents and iterate on system prompts before upgrading to paid tiers.

Give it a spin on your server! If you run into any WebSocket connection quirks or proxy issues, feel free to reach out or connect on social platforms.
