from fastapi import FastAPI, Depends, HTTPException
from app.db.databases import engine, Base, SessionLocal


app = FastAPI()
from app.routes import user, subject, chapter, progress, deadline, punishment, couple

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "https://study-tracker-ecru-one.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"status": "OK"}

@app.get("/db-test")
def db_test():
    return {"db": str(engine)}
# add in database.py

from fastapi import FastAPI
from app.db.databases import engine, Base



Base.metadata.create_all(bind=engine)

app.include_router(user.router)
app.include_router(subject.router)
app.include_router(chapter.router)
app.include_router(progress.router)
app.include_router(deadline.router)
app.include_router(punishment.router)
app.include_router(couple.router)


@app.get("/")
def root():
    return {"message": "Backend running 🚀"}