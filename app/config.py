from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    bot_token: str
    database_url: str
    admin_ids: list[int] = []
    api_port: int = 8080
    api_host: str = "0.0.0.0"
    webapp_url: str = ""
    channel_id: str = ""  # @channel_username or -100xxx

    model_config = {"env_file": ".env"}


settings = Settings()
