from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.databases import engine, Base
from app.routes import user, subject, chapter, progress, deadline, punishment, couple

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Routers
app.include_router(user.router)
app.include_router(subject.router)
app.include_router(chapter.router)
app.include_router(progress.router)
app.include_router(deadline.router)
app.include_router(punishment.router)
app.include_router(couple.router)

# Routes
@app.get("/")
def root():
    return {"message": "Backend running 🚀"}

@app.get("/health")
def health():
    return {"status": "OK"}

@app.get("/db-test")
def db_test():
    return {"db": "connected"}