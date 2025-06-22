import aiomysql

from .schema import mysql_pools


async def execute_sql(db: str, sql: str) -> str:
    print("sql_agent-------------")
    result = ""
    try:
        pool = mysql_pools[db]
        async with pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(sql)
                rows = await cur.fetchall()
                result = str(rows)
    except Exception as e:
        result = f"Error: {str(e)}"
    return f"数据库: {db}, 查询结果: {result}"
