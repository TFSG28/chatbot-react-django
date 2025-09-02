from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from ollama import Client
from .models import ChatHistory
from datetime import datetime
import uuid

ollama_client = Client()

@csrf_exempt
def predict(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST request required'}, status=405)

    try:
        # Parse JSON body
        body = json.loads(request.body)
        user_input = body.get('input', '').strip()

        if not user_input:
            return JsonResponse({'error': 'No input provided'}, status=400)

        # Send to Ollama
        if not ollama_client.is_model_loaded('deepseek-coder-v2'):
            return JsonResponse({'error': 'Please install the model first in Ollama'}, status=500)
        else:
            messages = [{"role": "user", "content": user_input}]
            response = ollama_client.chat(model='deepseek-coder-v2', messages=messages)
            prediction = response["message"]["content"]

        # Save to database
        chat_history = ChatHistory.objects.create(
            user_input=user_input,
            response=prediction
        )
        chat_history.save()

        return JsonResponse({'prediction': prediction})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

