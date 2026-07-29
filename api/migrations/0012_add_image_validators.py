from django.db import migrations, models
import api.validators


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_listing_order'),
    ]

    operations = [
        migrations.AlterField(
            model_name='game',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='game_images/', validators=[api.validators.validate_image_file]),
        ),
        migrations.AlterField(
            model_name='listing',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='marketplace_images/', validators=[api.validators.validate_image_file]),
        ),
    ]
