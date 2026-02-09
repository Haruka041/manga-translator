# Mangat

局域网漫画翻译 + 嵌字工具（Docker 一键启动）。

## 快速启动

### 方式 A：直接拉取 GHCR 镜像（推荐开源用户）

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 填写 `.env` 中的 OpenAI 兼容中转 API 参数与 `MASTER_KEY`。  
3. 启动（使用 GHCR 镜像）：

```bash
docker compose -f docker-compose.ghcr.yml up -d
```

> 如需指定版本镜像，修改 `.env` 中的 `MANGAT_IMAGE`。

---

### 方式 B：本地构建镜像

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 填写 `.env` 中的 OpenAI 兼容中转 API 参数（`OPENAI_BASE_URL` 不要重复 `/v1`）。
   - `MASTER_KEY` 用于加密保存 API Key（Fernet）
   - 生成示例：
     ```bash
     python - <<'PY'
     from cryptography.fernet import Fernet
     print(Fernet.generate_key().decode())
     PY
     ```

3. 启动：

```bash
docker compose up --build
```

- Web UI: `http://localhost:8000`
- API: `http://localhost:8000/api/...`

## 使用流程

1. 打开 Web UI → Create Job
2. 上传 CBZ/ZIP/PDF 或多张图片
3. 点击 Run
4. 完成后导出 CBZ

## 配置说明
- 全局设置与项目设置都可在前端修改
- 运行后项目锁定，配置不可再改

## GitHub Actions 发布
- 每次 push 到 `main` 自动构建并推送镜像
- 打 tag（如 `v0.1.0`）后自动发布 Release
- 产物：
  - GHCR Docker 镜像：`ghcr.io/<owner>/<repo>:v0.1.0`
  - Release 附件：`mangat-v0.1.0.tar.gz`（包含 `docker-compose.yml/docker-compose.ghcr.yml/.env.example/README.md`）

## GHCR 镜像可见性
开源仓库默认 GHCR 可能是私有的，请在 GitHub Packages 中将镜像设为 Public。

## 目录结构

```
backend/    FastAPI + Worker
frontend/   React (已内置到后端容器静态资源)
data/       运行时数据（原图/中间/成品/日志）
```

## 备注

- 阶段 A / B 模型通过 OpenAI 兼容 API 调用。
- PDF 解析依赖 `poppler-utils`（已在镜像内安装）。
- 如网关不支持 `response_format=json_schema`，可在 `.env` 设置 `MODEL_A_USE_SCHEMA=false`。
- 初次升级数据库结构时，建议执行 `docker compose down -v` 重新初始化本地数据库。

