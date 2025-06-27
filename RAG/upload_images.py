import os
import requests

folder_path = "./images"
url = "http://localhost:8082/embed"

for file in os.listdir(folder_path):
    if file.lower().endswith((".jpg", ".png", ".jpeg")):
        file_path = os.path.join(folder_path, file)
        text_description = os.path.splitext(file)[0].strip()

        with open(file_path, "rb") as f:
            files = {"image": (file, f, "image/jpeg")}
            data = {"text": text_description}
            response = requests.post(url, files=files, data=data)
            print(f"[{file}] -> {response.json()}")