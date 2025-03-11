from transformers import pipeline

def generate_prediction(prompt):
    # Загрузите модель (например, deepseek-ai/DeepSeek-R1 или любую другую)
    pipe = pipeline("text-generation", model="deepseek-ai/DeepSeek-R1", trust_remote_code=True)
    
    # Генерация текста
    messages = [
        {"role": "user", "content": prompt},
    ]
    result = pipe(messages)
    return result[0]['generated_text']

if __name__ == "__main__":
    import sys
    prompt = sys.argv[1]  # Получаем промпт из аргументов командной строки
    prediction = generate_prediction(prompt)
    print(prediction)  # Выводим результат