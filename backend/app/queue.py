import redis
from rq import Queue
from .config import settings


redis_conn = redis.from_url(settings.redis_url)
queue_stage_a = Queue(settings.queue_stage_a, connection=redis_conn)
queue_stage_b = Queue(settings.queue_stage_b, connection=redis_conn)
queue_qa = Queue(settings.queue_qa, connection=redis_conn)
