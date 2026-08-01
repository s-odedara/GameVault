import os
import django
import sys
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gamevault.settings')
django.setup()

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

u, _ = User.objects.get_or_create(username='testuser')
u.set_password('pass123')
u.save()
t, _ = Token.objects.get_or_create(user=u)

url = 'http://127.0.0.1:8001/api/listings/'
headers = {'Authorization': f'Token {t.key}'}
data = {
    'title': 'PS5 good',
    'description': 'ew fwaefg w g',
    'category': 'Physical Game',
    'condition': 'Good',
    'price': '23',
    'location': '',
    'seller_contact': '2332323232'
}
with open('requirements.txt', 'rb') as f:
    files = {'image': ('test.jpg', f, 'image/jpeg')}
    res = requests.post(url, headers=headers, data=data, files=files)

print(res.status_code)
print(res.text)
