from django.db import models

class ChatHistory(models.Model):
    id = models.AutoField(primary_key=True)
    user_input = models.TextField()
    response = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

