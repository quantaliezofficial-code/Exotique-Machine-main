import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import uvicorn
from backend.config import settings

if __name__ == "__main__":
    print(f" Starting Exotique Machines FastAPI backend on http://{settings.HOST}:{settings.PORT}")
    print(f" Swagger Interactive Docs: http://localhost:{settings.PORT}/docs")
    print(f" ReDoc Documentation: http://localhost:{settings.PORT}/redoc")
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info"
    )
