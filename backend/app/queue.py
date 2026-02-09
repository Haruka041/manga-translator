import importlib
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Any

from .config import settings


def _resolve_callable(path_or_callable: str | Callable[..., Any]) -> Callable[..., Any]:
    if callable(path_or_callable):
        return path_or_callable
    if not isinstance(path_or_callable, str) or "." not in path_or_callable:
        raise ValueError(f"Invalid callable path: {path_or_callable}")
    module_path, fn_name = path_or_callable.rsplit(".", 1)
    module = importlib.import_module(module_path)
    fn = getattr(module, fn_name, None)
    if not callable(fn):
        raise ValueError(f"Callable not found: {path_or_callable}")
    return fn


class SimpleQueue:
    def __init__(self, name: str, max_workers: int) -> None:
        self.name = name
        self.executor = ThreadPoolExecutor(
            max_workers=max(1, int(max_workers) if max_workers else 1),
            thread_name_prefix=f"queue-{name}",
        )

    def enqueue(self, fn: str | Callable[..., Any], *args, **kwargs):
        task = _resolve_callable(fn)
        return self.executor.submit(task, *args, **kwargs)

    def shutdown(self) -> None:
        self.executor.shutdown(wait=False)


queue_stage_a = SimpleQueue(settings.queue_stage_a, settings.stage_a_concurrency)
queue_stage_b = SimpleQueue(settings.queue_stage_b, settings.stage_b_concurrency)
queue_qa = SimpleQueue(settings.queue_qa, 1)


def shutdown_queues() -> None:
    for q in (queue_stage_a, queue_stage_b, queue_qa):
        q.shutdown()
