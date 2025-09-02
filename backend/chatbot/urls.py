from django.urls import path
from . import views

urlpatterns = [
    path('predict/', views.predict, name='predict'),
    path('sessions/', views.get_chat_sessions, name='get_chat_sessions'),
    path('sessions/<uuid:session_id>/', views.get_chat_history, name='get_chat_history'),
    path('sessions/<uuid:session_id>/delete/', views.delete_chat_session, name='delete_chat_session'),
]