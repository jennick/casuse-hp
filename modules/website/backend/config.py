import os
from pydantic import BaseSettings


class Settings(BaseSettings):
    WEBSITE_DB_HOST: str = os.getenv("WEBSITE_DB_HOST", "website-db")
    WEBSITE_DB_PORT: str = os.getenv("WEBSITE_DB_PORT", "5432")
    WEBSITE_DB_NAME: str = os.getenv("WEBSITE_DB_NAME", "casuse_hp_website")
    WEBSITE_DB_USER: str = os.getenv("WEBSITE_DB_USER", "website_user")
    WEBSITE_DB_PASSWORD: str = os.getenv("WEBSITE_DB_PASSWORD", "website_password")

    WEBSITE_BACKEND_PORT: int = int(os.getenv("WEBSITE_BACKEND_PORT", "8000"))
    WEBSITE_JWT_SECRET: str = os.getenv("WEBSITE_JWT_SECRET", "CHANGE_ME_LOCAL_ONLY")
    WEBSITE_JWT_ALGORITHM: str = os.getenv("WEBSITE_JWT_ALGORITHM", "HS256")
    WEBSITE_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("WEBSITE_ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )
    # NIEUW / TERUGGEZET: TTL voor registratie-/password-setup tokens (in minuten)
    WEBSITE_REGISTRATION_TOKEN_TTL_MINUTES: int = int(
        os.getenv("WEBSITE_REGISTRATION_TOKEN_TTL_MINUTES", "60")
    )

    # Omgeving (optioneel, maar handig voor logging/config)
    WEBSITE_ENV: str = os.getenv("WEBSITE_ENV", "local")

    # NIEUW: publieke basis-URL van de website-app voor links in e-mails/logs
    # - in dev:  http://localhost:20190
    # - in prod: https://www.casuse.mx
    WEBSITE_PUBLIC_BASE_URL: str = os.getenv(
        "WEBSITE_PUBLIC_BASE_URL",
        "http://localhost:20190",
    )

    # CORS-origins voor de website-backend.
    # Default bevat:
    # - bestaande admin/frontends
    # - nieuwe website-app dev (20190)
    # - productie-domeinen van de publieke website-app
    WEBSITE_CORS_ORIGINS: str = os.getenv(
        "WEBSITE_CORS_ORIGINS",
        ",".join(
            [
                "http://localhost:20060",   # bestaande core-frontend / admin
                "http://localhost:5173",    # evt andere dev-frontends
                "http://localhost:20190",   # NIEUW: casuse-website-app dev
                "https://www.casuse.mx",    # productie publieke site
                "https://casuse.mx",        # naked domein
            ]
        ),
    )

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return (
            f"postgresql+psycopg2://{self.WEBSITE_DB_USER}:"
            f"{self.WEBSITE_DB_PASSWORD}@"
            f"{self.WEBSITE_DB_HOST}:{self.WEBSITE_DB_PORT}/"
            f"{self.WEBSITE_DB_NAME}"
        )


settings = Settings()
