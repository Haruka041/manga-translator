# Mangat

局域网漫画翻译 + 嵌字工具（单容器部署）。面向“批量多页 → 自动识别 → 翻译 → 去字 → 中文嵌字”的完整流水线，并提供可视化 JSON/BBox 编辑与项目管理。

## 目录

1. 概览
2. 关键特性
3. 技术栈
4. Docker 一键启动（单容器）
5. 首次启动设置指引（向导）
6. 使用流程
7. 环境变量
8. 架构与数据流
9. 目录结构
10. 本地开发
11. GitHub Actions 构建发布
12. 故障排查

## 概览

Mangat 把漫画翻译与嵌字拆为两个严格阶段：

- **阶段 A**：多模态模型识别原文 + 翻译 + 生成 JSON（bbox、原文、译文、类型）
- **阶段 B**：生图模型执行去字与嵌字（按 JSON 严格定位）

并支持项目化管理、批量多页处理、以及逐页可视化校对。

## 关键特性

- 单容器部署（Docker Compose 仅 1 个服务）
- 阶段 A / B 严格分离（可按页重跑）
- 前端可视化 BBox 编辑 + JSON 编辑
- 全局配置 + 项目级配置
- 批量导入 CBZ/ZIP/PDF 或多图
- 输出 CBZ（默认）
- 首次启动设置向导（无需改一堆环境变量）

## 技术栈

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: React + Vite（静态资源内置到后端容器）
- **模型调用**: OpenAI 兼容 API（支持 Gemini/OpenAI/自建中转）
- **部署**: Docker / Docker Compose
- **存储**: 本地磁盘（`./data`）

## Docker 一键启动（单容器）

### 1. 克隆仓库

```bash
git clone https://github.com/Haruka041/manga-translator.git
cd manga-translator
```

### 2. 复制环境变量模板

```bash
cp .env.example .env
```

### 3. 生成并填写 `MASTER_KEY`

`MASTER_KEY` 用于加密保存 API Key。

```bash
python - <<'PY'
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
PY
```

将输出复制到 `.env` 中。

### 4A. 拉取 GHCR 镜像（推荐）

```bash
docker compose pull
docker compose up -d
```

### 4B. 本地构建镜像

```bash
docker compose up --build
```

### 5. 访问 Web

- Web UI: `http://localhost:8000`

## 首次启动设置指引（向导）

第一次进入 Web UI 会自动弹出 **设置向导**，引导你完成以下基础配置：

1. OpenAI 兼容中转 API 地址
2. API Key
3. 模型 A / 模型 B 的选择与协议

完成向导后即可开始创建项目与批量处理。高级参数仍可在「全局设置」面板中调整。

## 使用流程

1. 打开 Web UI → **Create Project**
2. 上传 **CBZ/ZIP/PDF** 或多张图片
3. 点击 **Run**
4. 处理完成后 **Export CBZ**

如需校对：

- 进入页面编辑器
- 修改 JSON 或 BBox
- 重新触发 Stage B

## 环境变量

| 变量名 | 说明 | 必填 |
| --- | --- | --- |
| `OPENAI_BASE_URL` | OpenAI 兼容 API 地址（不重复 `/v1`） | 否（可在向导里设置） |
| `OPENAI_API_KEY` | API Key | 否（可在向导里设置） |
| `MASTER_KEY` | Fernet 密钥，用于加密保存 API Key | 是 |
| `MANGAT_IMAGE` | 指定镜像版本 | 否 |

## 架构与数据流

### 阶段 A → 阶段 B

```
原图/扫描页
  ↓
阶段 A：多模态识别 + 翻译 → JSON
  ↓
阶段 B：去字 + 嵌字 → 成品图
  ↓
打包导出 CBZ
```

### 数据流

```
Web UI → API (FastAPI) → SQLite
                     ↓
        本地文件存储 ./data/jobs/<job_id>
```

### 队列与并发

本项目采用 **容器内进程级队列**（ThreadPool）完成 Stage A / B 批处理。
无需 Redis 或外部 Worker，单容器即可运行。

## 目录结构

```
backend/
  app/            FastAPI 源码
  Dockerfile      前后端打包镜像
frontend/
  src/            React UI
data/
  jobs/           所有项目与中间文件
docker-compose.yml
```

## 本地开发

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

默认前端开发端口：`http://localhost:5173`

## GitHub Actions 构建发布

本仓库已配置自动构建：

- push 到 `main` → 自动构建并推送 GHCR 镜像
- 打 tag（如 `v0.1.0`）→ 自动创建 Release

Release 包含：
- `docker-compose.yml`
- `.env.example`
- `README.md`

## 故障排查

### 1. API Key 无效

确认中转 API 正确，并在设置向导中重新填写。

### 2. 无法输出图片

检查 Stage B 使用的模型协议与 endpoint 是否正确。

### 3. 图片导入失败

确认上传文件是 CBZ/ZIP/PDF 或标准图片格式。

---

欢迎开源协作与 PR。 
