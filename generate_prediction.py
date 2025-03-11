
import sys
from transformers import pipeline

def generate_prediction(prompt):
    # Use a smaller model that works better in Replit's environment
    generator = pipeline('text-generation', model='distilgpt2')
    
    # Generate the prediction with specific parameters
    result = generator(
        prompt,
        max_length=100,
        num_return_sequences=1,
        temperature=0.7,
        top_k=50
    )
    
    # Format the response
    prediction = result[0]['generated_text']
    # Clean up the prediction and add emoji
    prediction = prediction.replace(prompt, "").strip()
    if not prediction:
        prediction = "Ваш день будет наполнен смехом и мемами! 😂"
    
    # Add emojis to make it more fun
    prediction = f"🔮 {prediction} 🎭"
    
    return prediction

if __name__ == "__main__":
    if len(sys.argv) > 1:
        prompt = sys.argv[1]  # Get prompt from command line arguments
        try:
            prediction = generate_prediction(prompt)
            print(prediction)
        except Exception as e:
            print(f"🔮 День будет полон сюрпризов и неожиданностей! 🎉")
    else:
        print("🔮 Сегодня будет удачный день! 🍀")
