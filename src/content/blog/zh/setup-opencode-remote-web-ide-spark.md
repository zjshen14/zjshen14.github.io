---
title: "实战记录：远程部署 OpenCode Web IDE 与代理配置，接入 Spark 1.3 开发者免费额度"
description: "总结 Agent Hosting 项目实战经验：如何搭建支持远程浏览器访问的 OpenCode Web IDE，配置 HTTP/WebSocket 反向代理，并接入 Spark 1.3 免费开发者额度，实现手机与电脑多端随时随地驱动 Agent 开发。"
pubDate: 2026-09-26
tags: ["ai", "agent", "opencode", "spark", "web-ide", "tutorial"]
draft: false
---

在最近的 **Agent Hosting** 项目中，我们遇到了一个非常典型的场景：如何让自主 AI Agent 拥有一个 **7×24 小时常驻、不依赖单台本地机器、且能随时从任何设备打开浏览器进行操作与监控的 Web IDE 环境**？

很多朋友在本地跑 Agent 时都有类似痛点：
- 笔记本一关盖子，跑了半个小时的长任务直接断掉；
- 外出时临时想看一眼 Agent 的进展或调个参数，手机或随身轻薄本上根本没有本地开发环境；
- API Token 散落在各个设备上，环境不一致。

为了解决这个问题，我们为团队搭建了基于 **OpenCode** 的云端 Web IDE 方案，并通过 **HTTP / WebSocket 反向代理** 实现了安全的远程访问。更重要的是，现在 **Spark 1.3 (星火/Spark 开发者版)** 正好面向开发者提供了**免费额度 (Free Quota)**，接入后可以近乎零成本跑通整套 Agent 流程。

今天这篇文章就把我们之前的实践经验梳理成教程，方便有类似需求的朋友在自己的 VPS 或服务器上快速搭建一套属于自己的云端 Agent 工作台。

---

## 整体架构设计

整个系统的核心拓扑非常直观：

```text
[ 笔记本 / 手机 / 平板 ] (Chrome/Safari 浏览器)
           │
           │ HTTPS / WSS (安全加密链路)
           ▼
[ 云服务器 / VPS ]
     ├── Nginx / Caddy (HTTP & WebSocket 反向代理 + SSL 证书)
     │         │
     │         ▼ 反向代理至本地端口 (如 127.0.0.1:8080)
     └── OpenCode Web IDE 服务
               │
               ▼ 驱动 Agent 工具调用与执行
     [ Spark 1.3 LLM API (开发者免费 Quota) ]
```

### 为什么必须配置 HTTP / WebSocket 反向代理？
OpenCode 这类 Web IDE 在浏览器中运行时，绝不仅仅是加载几个静态页面：
1. **持久 WebSocket 通信**：网页内置终端（Terminal）、代码语言服务（LSP）和 Agent 的实时流式输出，全部重度依赖 WebSocket 连接。如果只是简单的 HTTP 转发，终端会直接报 `Connection failed`。
2. **HTTPS / WSS 加密**：公网环境下明文传输代码和 Cookie 极度危险，同时现代浏览器的很多特性（如剪贴板 API、Service Worker）也强制要求 HTTPS。
3. **统一入口与安全认证**：避免在防火墙上暴露乱七八糟的内部端口，可以通过代理层附加 HTTP Basic Auth 或 IP 白名单。

---

## 第一步：在服务器上启动 OpenCode

首先在你的 Linux 服务器（Ubuntu / Debian / CentOS 均可）上安装并配置 OpenCode。

以常规 Node/Python 或二进制安装为例，建议让 OpenCode 仅监听在 **`127.0.0.1`**（避免未授权直接暴露给公网）：

```bash
# 启动 OpenCode 并绑定到本地 8080 端口，设置工作区目录
opencode serve --host 127.0.0.1 --port 8080 --workspace /home/ubuntu/workspace
```

为了保证服务器重启或终端断开后服务依然存活，推荐编写一个简单的 **systemd** 服务文件：

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

启动并设置开机自启：
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now opencode
sudo systemctl status opencode
```

---

## 第二步：配置 HTTP / WebSocket 反向代理

接下来我们需要配置一个反向代理，把公网的 HTTPS 请求安全转发给后端的 OpenCode 服务。这里推荐两种常见方式：**Caddy**（极简免维护）和 **Nginx**（传统高定制）。

### 方案 A：使用 Caddy（最简单，自带自动 HTTPS）
如果你不想手动申请和续签 Let's Encrypt 证书，Caddy 是最佳选择：

```text
# /etc/caddy/Caddyfile
ide.yourdomain.com {
    reverse_proxy 127.0.0.1:8080
}
```
保存后执行 `sudo systemctl reload caddy`，Caddy 会自动帮你搞定 SSL 证书并完整透传 WebSocket。

### 方案 B：使用 Nginx（经典方案，支持高级鉴权）
如果你的服务器已经有现成的 Nginx，可以添加如下 Server 块：

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

    # SSL 证书路径（可使用 certbot 生成）
    ssl_certificate /etc/letsencrypt/live/ide.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ide.yourdomain.com/privkey.pem;

    # 关键：开启大文件上传与超时时间调整，避免长耗时 Agent 任务中断
    client_max_body_size 100M;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;

    location / {
        proxy_pass http://127.0.0.1:8080;

        # 核心：必须配置以下三行以支持 WebSocket 终端连接
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 传递真实客户端信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

测试并重载 Nginx：
```bash
sudo nginx -t && sudo systemctl reload nginx
```

此时，你就可以在浏览器中直接通过 `https://ide.yourdomain.com` 访问到完整流畅的 Web IDE 界面了。

---

## 第三步：接入 Spark 1.3 开发者免费 Quota

在 OpenCode 中驱动 Agent，不可或缺的是底层的大语言模型。

当前 **Spark 1.3** 针对开发者社区开放了非常友好的 **Free Quota（开发者免费额度）**。对于个人开发者、做 Agent 概念验证（PoC）或跑日常测试来说，这个额度足够日常高频使用，完全不需要担心一不留神跑出高额账单。

### 1. 获取 Spark 1.3 API Key
- 前往官方开放平台注册开发者账号并完成实名认证；
- 进入控制台创建应用，找到 **Spark 1.3 Developer Edition**；
- 领取专属的免费调用包（Free Quota），并复制你的 `APIKey` 与 `APISecret`（或统一 Bearer Token）。

### 2. 在 OpenCode 环境中注入模型配置
在 OpenCode 所在服务器的工作区目录中，创建或编辑环境变量文件（如 `.env` 或在 Agent 框架的 `config.json` 中）：

```bash
# Spark 1.3 模型配置
SPARK_API_VERSION=v1.3
SPARK_API_KEY="your-spark-api-key-here"
SPARK_API_SECRET="your-spark-api-secret-here"
SPARK_BASE_URL="https://spark-api-open.xf-yun.com/v1" # 开发者兼容接口
```

如果你的 Agent 工具依赖 OpenAI 兼容格式，可以通过官方提供的兼容端点或轻量转发层，把 Spark 1.3 映射为标准的 Chat Completion API。

在 OpenCode 的终端里写一个简单的测试脚本验证调用：

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

运行后看到返回，说明模型通道与 Agent 环境已经完全打通！

---

## 第四步：多端实战体验：手机 + 笔记本协同

搭建完毕后，最爽的当属工作流的跨设备自由度：

1. **主力开发场景（Laptop）**：
   在笔记本浏览器里打开 `https://ide.yourdomain.com`，敲代码、调试语法高亮、看 Diff，体验与本地桌面版 VS Code / IDE 几乎没有任何区别。
2. **挂机与后台任务（Server Native）**：
   让 Agent 自动检索文档、跑爬虫或重构大文件时，直接把命令扔在 IDE 内置的终端里。关掉笔记本盖子走人，服务器后台依然全速运行。
3. **移动端碎片监控（Phone / Tablet）**：
   出门在外时，只需掏出手机打开 Safari / Chrome，直接就能看到 Agent 跑出来的中间结果，甚至能用手机软键盘补上一条 Prompt：“*帮我把刚刚跑完的测试 log 总结一下*”。

---

## 结语与注意事项

通过 **云端 OpenCode + 反向代理 + Spark 1.3 免费额度** 的组合，我们以极低的成本获得了一个全天候属于自己的自主 Agent 实验台。

最后提两个安全层面的小建议：
- **务必加上访问认证**：Web IDE 拥有完整的服务器终端权限，公网访问务必在 OpenCode 内部设置密码，或者在 Nginx 层加上 `auth_basic`，谨防弱口令被扫；
- **利用好免费 Quota**：当前 Spark 1.3 开发者版的免费额度非常适合跑原型测试与日常脚本，建议监控调用用量，合理调度。

如果你也在探索 Agent Hosting 或云端研发环境，不妨动手试一试！如果在部署过程中遇到任何端口或 WebSocket 代理问题，欢迎在社交网络或评论区随时交流探讨。
