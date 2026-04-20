from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.databases import engine, Base
from app.routes import user, subject, chapter, progress, deadline, punishment, couple, reward, daily_image

app = FastAPI()

# CORS
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

# Routers and Tables
from sqlalchemy import text
@app.on_event("startup")
def run_migrations():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    with engine.begin() as conn: # engine.begin() handles transactions automatically
        try:
            conn.execute(text("ALTER TABLE chapters ADD COLUMN IF NOT EXISTS name VARCHAR(200)"))
            conn.execute(text("ALTER TABLE subjects ALTER COLUMN name TYPE VARCHAR(200)"))
            conn.execute(text("ALTER TABLE punishments ADD COLUMN IF NOT EXISTS task_id INTEGER REFERENCES deadlines(id)"))
            conn.execute(text("ALTER TABLE punishments ADD COLUMN IF NOT EXISTS category VARCHAR(50)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            conn.execute(text("ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS secret_message VARCHAR(500)"))
            print("Migration successful!")
        except Exception as e:
            print(f"Migration notice (already applied or error): {e}")

# Routers
app.include_router(user.router)
app.include_router(subject.router)
app.include_router(chapter.router)
app.include_router(progress.router)
app.include_router(deadline.router)
app.include_router(punishment.router)
app.include_router(couple.router)
app.include_router(reward.router)
app.include_router(daily_image.router)

# Routes
@app.get("/")
def root():
    return {"message": "Backend running 🚀"}

