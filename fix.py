import os

code = open('frontend/src/pages/CollectionPage.jsx', 'r', encoding='utf-8').read()
code = code.replace(
    "'calendar': 'released',",
    "'calendar': 'released',\n      'new': '-added',\n      'top': '-rating',\n      'best2024': '-rating',\n      'upcoming': 'released',\n      'recent': '-added',"
)

switch_block = """      case 'best-of-year': {
        dateParam = `${currentYear}-01-01,${currentYear}-12-31`;
        pageTitle = `Best of ${currentYear}`;
        break;
      }
      case 'new': {
        const last6Months = new Date();
        last6Months.setMonth(today.getMonth() - 6);
        dateParam = `${formatDate(last6Months)},${formatDate(today)}`;
        pageTitle = 'New & Trending';
        break;
      }
      case 'top': {
        pageTitle = 'Top Rated';
        break;
      }
      case 'best2024': {
        dateParam = `2024-01-01,2024-12-31`;
        pageTitle = 'Best of 2024';
        break;
      }
      case 'upcoming': {
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);
        dateParam = `${formatDate(today)},${formatDate(nextYear)}`;
        pageTitle = 'Coming Soon';
        break;
      }
      case 'recent': {
        pageTitle = 'Recently Added';
        break;
      }
      default: {"""

code = code.replace(
    "case 'best-of-year': {\n        dateParam = `${currentYear}-01-01,${currentYear}-12-31`;\n        pageTitle = `Best of ${currentYear}`;\n        break;\n      }\n      default: {",
    switch_block
)

open('frontend/src/pages/CollectionPage.jsx', 'w', encoding='utf-8').write(code)

# Now fix views.py
views_code = open('api/views.py', 'r', encoding='utf-8').read()
views_code = views_code.replace(
"""            user = User.objects.filter(email=email).first()
            if not user:
                base_username = email.split('@')[0]
                username = base_username
                count = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{count}"
                    count += 1
                
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=get_random_string(32)
                )

            token, _ = Token.objects.get_or_create(user=user)
            return Response({"token": token.key, "user_id": user.id, "username": user.username})""",
"""            # Generate proper username
            given_name = idinfo.get('given_name')
            name = idinfo.get('name')
            base_username = given_name if given_name else (name.split()[0] if name else email.split('@')[0])
            
            user = User.objects.filter(email=email).first()
            if not user:
                username = base_username.replace(' ', '')
                count = 1
                while User.objects.filter(username__iexact=username).exists():
                    username = f"{base_username.replace(' ', '')}{count}"
                    count += 1
                
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=get_random_string(32),
                    first_name=given_name or ''
                )
            else:
                if given_name and not user.first_name:
                    user.first_name = given_name
                    user.save(update_fields=['first_name'])

            token, _ = Token.objects.get_or_create(user=user)
            # Return actual name as actual_name
            actual_name = user.first_name if user.first_name else user.username
            return Response({"token": token.key, "user_id": user.id, "username": user.username, "actual_name": actual_name})"""
)
open('api/views.py', 'w', encoding='utf-8').write(views_code)
