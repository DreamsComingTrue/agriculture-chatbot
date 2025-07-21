import json
import os

from dotenv import load_dotenv

# Determine environment (you can also use an env var to decide)
env = os.getenv("APP_ENV", "dev")  # default to 'dev'

# Load the appropriate .env file
dotenv_path = os.path.join(os.path.dirname(__file__), f".env.{env}")
load_dotenv(dotenv_path)

# DB_URL_LIST_STR = os.getenv("DB_URL_LIST")
# DB_URL_LIST = []

SERVER_INFO_STR = os.getenv("SERVER_INFO", "")
SERVER_INFO = {}
try:
    # Now you can access variables:
    # DB_URL_LIST = json.loads(DB_URL_LIST_STR if DB_URL_LIST_STR else "")
    # print("DB_URL_LIST:", DB_URL_LIST)
    SERVER_INFO = json.loads(SERVER_INFO_STR)
    print("SERVER_INFO:", SERVER_INFO)
except Exception as e:
    print(e)
