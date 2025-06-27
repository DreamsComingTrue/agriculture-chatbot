import json

def load_structured_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    docs = []
    for item in data.get("pests",[]) :
        # print(item)
        docs.append(item['content'])
    if "weed" in data:
        weed=data["weed"]
        docs.append(weed['content'])

    # # 处理病虫害
    # for item in data.get("pests", []):
        
    #     full_text = f"{item['title']}\n"
    #     full_text += f"{item['title']}\n"
    #     full_text += f"{item['title']}\n"
    #     full_text += f"{item['type']}\n"
    #     full_text += f"{item['symptom_field']}：{item['symptom_content']}\n"
    #     full_text += f"{item['rule_field']}：{item['rule_content']}\n"
    #     full_text += f"{item['control_field']}：{item['control_content']}\n"
    #     docs.append((item, full_text))

    # # 处理杂草防除
    # if "weed" in data:
    #     weed = data["weed"]
    #     full_text = f"{weed['title']}\n"
    #     full_text += f"{weed['type']}\n"
    #     full_text += f"{weed['content']}\n"

    #     docs.append((weed, full_text))

    return docs

def main():
    filepath = "structured_data-2.json"

    docs = load_structured_json(filepath)
    i=0
    for text in docs :
        print("text:________")
        print(text)
        i=i+1
        # if i>3:
        #     break

if __name__ == "__main__":
    main()