from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    bot_token: str
    database_url: str
    admin_ids: list[int] = []
    api_port: int = 8080
    api_host: str = "127.0.0.1"  # Только через nginx, не напрямую
    webapp_url: str = ""
    channel_id: str = ""  # @channel_username or -100xxx
    admin_token: str = ""  # Secret token for admin Mini App auth

    model_config = {"env_file": ".env"}


settings = Settings()
