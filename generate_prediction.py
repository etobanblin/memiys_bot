        import sys
        from transformers import pipeline

        def generate_prediction(prompt):
            try:
                generator = pipeline('text-generation', model='distilgpt2')
                result = generator(
                    prompt,
                    max_length=100,
                    num_return_sequences=1,
                    temperature=0.7,
                    top_k=50
                )
                prediction = result[0]['generated_text'].replace(prompt, "").strip()
                if not prediction:
                    prediction = "Ваш день будет наполнен смехом и мемами! 😂"
                return f"🔮 {prediction} 🎭"
            except Exception as e:
                print(f"Ошибка при генерации предсказания: {e}", file=sys.stderr)
                return "🔮 День будет полон сюрпризов и неожиданностей! 🎉"

        if __name__ == "__main__":
            if len(sys.argv) > 1:
                prompt = sys.argv[1]
                prediction = generate_prediction(prompt)
                print(prediction)
            else:
                print("🔮 Сегодня будет удачный день! 🍀")