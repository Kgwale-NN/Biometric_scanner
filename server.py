# Convenience wrapper so you can run `uvicorn server:app` from the repo root
from api.server import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
