"""
Run once to create all database tables and seed a default admin clinician.

    python init_db.py

You will be prompted to set the admin password, or press Enter to use the default.
Change the default password on first login in a production deployment.
"""
import getpass
from database import engine, SessionLocal, Base
import models
from auth import hash_password


def main():
    print("Creating database tables…")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(models.Clinician).filter_by(username="admin").first()
        if existing:
            print("✓ Database already initialised. Admin user exists.")
            return

        print("\nNo admin user found. Creating default admin account.")
        password = getpass.getpass("Set admin password (Enter for 'CogAssess2026!'): ").strip()
        if not password:
            password = "CogAssess2026!"

        db.add(models.Clinician(
            username="admin",
            hashed_password=hash_password(password),
            full_name="Administrator",
        ))
        db.commit()
        print("\n✓ Database ready.")
        print("  Login:    admin")
        print(f"  Password: {'(as entered)' if password != 'CogAssess2026!' else 'CogAssess2026!'}")
        print("\n  Change this password before deploying to a clinical environment.\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
