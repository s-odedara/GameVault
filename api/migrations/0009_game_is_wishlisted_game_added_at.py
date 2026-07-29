# Generated for GameVault — adds real Wishlist support

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_game_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='is_wishlisted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='game',
            name='added_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
    ]
