import json
import re

from utils.models import clean_llm_response, generate_with_ollama


def stringifySchema(schemas):
    json_schema = json.dumps(schemas)
    cleaned_str = re.sub(r"\\n", " ", json_schema)  # Replace all \n with a space
    return cleaned_str


async def generate_sql(query, schemas) -> str:
    try:
        schemasStr = stringifySchema(schemas)
        print("schema---------------", schemasStr)
        prompt = f"""## 数据库 schema: {schemasStr} ## 用户问题: "{query}" ## 要求: 根据schema, 生成一条SQL解决用户问题, 如果无法解决, 则只返回"no". 结果只包含一条SQL语句或者"no" """

        prompt = re.sub(r"\\n", " ", prompt)
        output = await generate_with_ollama(prompt=prompt)
        print("output-------------------------", output["response"])
        cleaned = clean_llm_response(output["response"])
        if cleaned == "no":
            return ""
        # cleaned = extract_sql_queries(cleaned)[0]
        print("cleaned-------------------------", cleaned)
        return cleaned
    except Exception as e:
        print("router error----------------", e)
        return ""


def extract_sql_queries(text):
    """
    Extracts SQL queries from text that's formatted with ```sql markers.
    Args:
        text (str): The input text containing SQL queries.
    Returns:
        list: A list of extracted SQL queries.
    """
    # Pattern to match SQL between ```sql and ```
    # Uses non-greedy matching and handles multi-line queries
    pattern = r"```sql\n(.*?)\n```"
    # Find all matches (re.DOTALL makes . match newlines)
    sql_queries = re.findall(pattern, text, re.DOTALL)
    # Clean up each query by stripping whitespace
    return [query.strip() for query in sql_queries]
