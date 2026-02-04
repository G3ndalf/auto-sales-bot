from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    bot_token: str
    database_url: str

    model_config = {"env_file": ".env"}


settings = Settings()
