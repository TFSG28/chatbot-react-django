# backend/chatbot/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
import json
from ollama import Client
from .models import ChatHistory, ChatSession

ollama_client = Client()

@csrf_exempt
def predict(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        body = json.loads(request.body)
        user_input = body.get("input", "").strip()
        session_id = body.get("session_id")

        if not user_input:
            return JsonResponse({"error": "No input provided"}, status=400)

        # Get or create chat session
        session = None
        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id)
            except ChatSession.DoesNotExist:
                pass
        
        if not session:
            # Create new session with a title based on first message
            chat_title = user_input[:50] + "..." if len(user_input) > 50 else user_input
            session = ChatSession.objects.create(chat_name=chat_title)

        # Send to Ollama
        if not ollama_client:
            return JsonResponse(
                {"error": "Please install the model first in Ollama"}, status=500
            )
        else:
            messages = [{"role": "user", "content": user_input}]
            response = ollama_client.chat(model="deepseek-coder-v2", messages=messages)
            prediction = response["message"]["content"]

        # Save to database
        ChatHistory.objects.create(
            session=session,
            user_input=user_input, 
            response=prediction
        )

        return JsonResponse({
            "prediction": prediction,
            "session_id": str(session.id),
            "chat_title": session.chat_name
        })

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def get_chat_sessions(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET request required"}, status=405)

    try:
        sessions = ChatSession.objects.all()
        sessions_data = []
        
        for session in sessions:
            # Get the last message for preview
            last_message = session.messages.first()  # Since we order by timestamp, first() gets the oldest
            last_message_content = ""
            if last_message:
                last_message_content = last_message.user_input[:50] + "..." if len(last_message.user_input) > 50 else last_message.user_input

            sessions_data.append({
                "id": str(session.id),
                "title": session.chat_name,
                "timestamp": session.updated_at.isoformat(),
                "lastMessage": last_message_content
            })

        return JsonResponse({"sessions": sessions_data})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def get_chat_history(request, session_id):
    if request.method != "GET":
        return JsonResponse({"error": "GET request required"}, status=405)

    try:
        session = get_object_or_404(ChatSession, id=session_id)
        messages = session.messages.all()
        
        messages_data = []
        for message in messages:
            messages_data.extend([
                {
                    "id": f"{message.id}_user",
                    "content": message.user_input,
                    "role": "user",
                    "timestamp": message.timestamp.isoformat()
                },
                {
                    "id": f"{message.id}_assistant",
                    "content": message.response,
                    "role": "assistant",
                    "timestamp": message.timestamp.isoformat()
                }
            ])

        return JsonResponse({
            "messages": messages_data,
            "session_title": session.chat_name
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def delete_chat_session(request, session_id):
    if request.method != "DELETE":
        return JsonResponse({"error": "DELETE request required"}, status=405)

    try:
        session = get_object_or_404(ChatSession, id=session_id)
        session.delete()
        return JsonResponse({"message": "Session deleted successfully"})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)