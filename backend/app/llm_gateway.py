import base64
import json
from pathlib import Path
from typing import Any, Dict, Optional
import httpx

from .config import settings


def _image_to_b64(path: str) -> str:
    data = Path(path).read_bytes()
    return base64.b64encode(data).decode("utf-8")


def _join_url(base: str, path: str) -> str:
    base = base.rstrip("/")
    if base.endswith("/v1") and path.startswith("/v1/"):
        return f"{base}{path[3:]}"
    return f"{base}{path}"


def _headers(api_key: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {api_key}"}


def _request_with_retry(url: str, headers: dict, payload: dict, timeout: int, retries: int) -> dict:
    last_err = None
    for attempt in range(retries + 1):
        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            last_err = e
    raise last_err


def _request_with_retry_multipart(url: str, headers: dict, data: dict, files: dict, timeout: int, retries: int) -> dict:
    last_err = None
    for attempt in range(retries + 1):
        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.post(url, headers=headers, data=data, files=files)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            last_err = e
    raise last_err


def _resolve(cfg: dict, key: str, default: Any) -> Any:
    return cfg.get(key, default)


def call_stage_a(
    image_path: str,
    prompt: str,
    context_text: str,
    schema: Optional[dict],
    cfg: dict,
    api_key: str,
) -> Dict[str, Any]:
    base_url = _resolve(cfg, "openai_base_url", settings.openai_base_url)
    model = _resolve(cfg, "model_a", settings.model_a)
    protocol = _resolve(cfg, "model_a_protocol", settings.model_a_protocol)
    timeout = int(_resolve(cfg, "stage_a_timeout", settings.stage_a_timeout))
    retries = int(_resolve(cfg, "retries", settings.retries))

    b64 = _image_to_b64(image_path)

    if protocol == "responses":
        payload = {
            "model": model,
            "input": [
                {
                    "role": "system",
                    "content": [{"type": "text", "text": prompt}],
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": context_text},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    ],
                },
            ],
            "temperature": 0.2,
        }
        if schema:
            payload["response_format"] = {"type": "json_schema", "json_schema": schema}
        url = _join_url(base_url, "/v1/responses")
    else:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": context_text},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    ],
                },
            ],
            "temperature": 0.2,
        }
        if schema:
            payload["response_format"] = {"type": "json_schema", "json_schema": schema}
        url = _join_url(base_url, "/v1/chat/completions")

    data = _request_with_retry(url, _headers(api_key), payload, timeout, retries)

    content = None
    if "choices" in data:
        content = data["choices"][0]["message"]["content"]
    elif "output" in data:
        output = data["output"][0]
        if "content" in output and len(output["content"]) > 0:
            content = output["content"][0].get("text")

    if content is None:
        raise ValueError("No content from model A")

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1:
            return json.loads(content[start : end + 1])
        raise


def call_stage_b(image_path: str, prompt: str, json_payload: Dict[str, Any], cfg: dict, api_key: str) -> bytes:
    base_url = _resolve(cfg, "openai_base_url", settings.openai_base_url)
    model = _resolve(cfg, "model_b", settings.model_b)
    protocol = _resolve(cfg, "model_b_protocol", settings.model_b_protocol)
    endpoint = _resolve(cfg, "model_b_endpoint", settings.model_b_endpoint)
    timeout = int(_resolve(cfg, "stage_b_timeout", settings.stage_b_timeout))
    retries = int(_resolve(cfg, "retries", settings.retries))

    json_text = json.dumps(json_payload, ensure_ascii=False)

    if protocol == "images_edits":
        url = _join_url(base_url, endpoint)
        image_bytes = Path(image_path).read_bytes()
        files = {"image": ("image.png", image_bytes, "application/octet-stream")}
        data = {
            "model": model,
            "prompt": f"{prompt}\n\nJSON:\n{json_text}",
            "response_format": "b64_json",
        }
        res = _request_with_retry_multipart(url, _headers(api_key), data, files, timeout, retries)
        b64 = res["data"][0].get("b64_json")
        if not b64:
            raise ValueError("No image data returned from model B")
        return base64.b64decode(b64)

    b64 = _image_to_b64(image_path)
    payload = {
        "model": model,
        "input": [
            {"role": "system", "content": [{"type": "text", "text": prompt}]},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"JSON:\n{json_text}"},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                ],
            },
        ],
        "response_format": {"type": "image"},
    }
    url = _join_url(base_url, "/v1/responses")
    res = _request_with_retry(url, _headers(api_key), payload, timeout, retries)

    if "output" in res:
        for block in res["output"]:
            for c in block.get("content", []):
                if c.get("type") == "image" and c.get("image_base64"):
                    return base64.b64decode(c["image_base64"])
                if c.get("type") == "image_url" and c.get("url"):
                    raise ValueError("Image URL returned; configure downloader in gateway.")

    raise ValueError("No image data returned from model B")
