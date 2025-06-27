import requests

API_URL = "http://localhost:8082/search"

print("玉米病虫草害智能检索系统（输入 exit 退出）\n")

while True:
    query = input("请输入查询内容：").strip()
    if query.lower() in {"exit", "quit"}:
        print("已退出程序。")
        break

    try:
        response = requests.get(API_URL, params={"query": query, "top_k": 2})
        response.raise_for_status()
        results = response.json()

        if not results:
            print("未找到相关内容。\n")
            continue

        for i, payload in enumerate(results):
            print(f"\n--- Top {i+1} ---")
            
          
            # print(payload)
            # if payload.get("page_title"):
            #     print(payload['page_title'])

            if payload.get("page_content"):
                print(payload["page_content"])



            if payload.get("image_path"):
                print(f"图片路径：{payload['image_path']}")
            print("-" * 40)

    except Exception as e:
        print(f"查询出错：{e}")