from fastapi import FastAPI, Depends, HTTPException
from app.db.databases import engine, Base, SessionLocal


app = FastAPI()
from app.routes import user, subject, chapter, progress, deadline, punishment, couple

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


app = FastAPI()

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