from typing import Dict

import aiomysql

from env import DB_URL_LIST

# Maintain connection pool for each DB
mysql_pools: Dict[str, aiomysql.Pool] = {}


async def init_db_pools():
    global mysql_pools
    for config in DB_URL_LIST:
        print("DB_URL_LIST--------", config)
        pool = await aiomysql.create_pool(
            host=config["host"],
            port=config["port"],
            user=config["user"],
            password=config["password"],
            db=config["db"],
            autocommit=True,
        )
        mysql_pools[config["db"]] = pool


async def fetch_schema(pool: aiomysql.Pool) -> str:
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                """
                SELECT
                    c.TABLE_NAME AS table_name,
                    c.COLUMN_NAME AS column_name,
                    c.DATA_TYPE AS data_type
                FROM
                    information_schema.COLUMNS c
                WHERE
                    c.TABLE_SCHEMA = DATABASE()
                ORDER BY
                    c.TABLE_NAME, c.ORDINAL_POSITION;
                """
            )
            rows = await cur.fetchall()
            schema_lines = []
            current_table = None
            for row in rows:
                if row["table_name"] != current_table:
                    current_table = row["table_name"]
                    schema_lines.append(f"\nTable {current_table}:")
                schema_lines.append(f"  - {row['column_name']} ({row['data_type']})")
            return "\n".join(schema_lines)


async def get_all_schemas(db: str) -> Dict[str, str]:
    schema = await fetch_schema(mysql_pools[db])
    return dict(zip(db, schema))
