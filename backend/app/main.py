from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.routes import api_router
from app.core.cache import get_redis_client, close_redis_client, set_cache, get_cache

# Setup logger để in ra console cho dễ nhìn
logger = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # --- STARTUP ---
    logger.info("System Startup: Initializing Redis...")
    
    # 1. Khởi tạo kết nối (Ping test bên trong)
    await get_redis_client()
    
    # 2. TEST GHI DỮ LIỆU THỰC TẾ
    test_key = "test:startup_check"
    test_value = {"status": "connected", "message": "Redis Cloud write is working!"}
    
    logger.info(f"Testing Redis Write with key: '{test_key}'...")
    write_success = await set_cache(test_key, test_value, ttl=300)
    
    if write_success:
        logger.info("REDIS WRITE SUCCESS: Đã ghi được key test vào Redis.")
        
        # 3. Test đọc lại ngay lập tức
        read_value = await get_cache(test_key)
        if read_value:
            logger.info(f"EDIS READ SUCCESS: Đọc lại được dữ liệu -> {read_value}")
        else:
            logger.error("REDIS READ FAILED: Ghi thành công nhưng không đọc lại được (???).")
    else:
        logger.error("REDIS WRITE FAILED: Hàm set_cache trả về False. Hãy kiểm tra log warning phía trên!")

    yield
    
    # --- SHUTDOWN ---
    logger.info("System Shutdown: Closing Redis connection...")
    await close_redis_client()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="REST API for the Study Space booking system",
    lifespan=lifespan,
)

# Rate limiting middleware (security measure)
app.add_middleware(RateLimitMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}