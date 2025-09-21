import json
import re
from dataclasses import dataclass
from typing import Any

global_config = None

@dataclass
class Config:
    rag_url: str
    mcp_url: str
    MCP_TRIGGER_KEYWORDS: list[str]
    PROMPT_TRIGGER_KEYWORDS: list[str]
    fuxi_schemas: Any
    fuxi_keywords_table_list: list[Any]
    rag_classification: list[str]

class ConfigObject:
    def __init__(self, data):
        for key, value in data.items():
            if isinstance(value, dict):
                setattr(self, key, ConfigObject(value))
            else:
                setattr(self, key, value)

# Load config from JSON file
def load_config():
    global global_config
    try:
        with open('config.jsonc', 'r') as f:
            """Load JSON file with comments (// and /* */)"""
            content = f.read()
            
            # Remove // comments
            content = re.sub(r'//\s+.*\n', '', content)
            # Load configuration at the beginning
            global_config = Config(**json.loads(content))
            print("global mcp_url: -------", global_config.mcp_url)
            return
    except FileNotFoundError:
        print("Error: config.jsonc file not found")
        exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in config.jsonc: {e}")
        print(f"Error at line {e.lineno}, column {e.colno}")
        exit(1)

