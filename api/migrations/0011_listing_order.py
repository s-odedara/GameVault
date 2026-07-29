import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_follow'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Listing',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=150)),
                ('description', models.TextField()),
                ('category', models.CharField(choices=[('Physical Game', 'Physical Game'), ('Console', 'Console'), ('Controller/Peripheral', 'Controller / Peripheral'), ('Merchandise', 'Merchandise'), ('Collectible', 'Collectible'), ('Other', 'Other')], default='Other', max_length=30)),
                ('condition', models.CharField(choices=[('New', 'New — sealed/unused'), ('Like New', 'Like New — barely used'), ('Good', 'Good — normal wear'), ('Fair', 'Fair — visible wear, fully working')], default='Good', max_length=20)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('location', models.CharField(blank=True, max_length=100, null=True)),
                ('image', models.ImageField(blank=True, null=True, upload_to='marketplace_images/')),
                ('status', models.CharField(choices=[('Active', 'Active'), ('Sold', 'Sold'), ('Removed', 'Removed')], default='Active', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('seller', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='listings', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('razorpay_order_id', models.CharField(blank=True, max_length=100, null=True)),
                ('razorpay_payment_id', models.CharField(blank=True, max_length=100, null=True)),
                ('razorpay_signature', models.CharField(blank=True, max_length=255, null=True)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Paid', 'Paid'), ('Cancelled', 'Cancelled')], default='Pending', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('buyer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='purchases', to=settings.AUTH_USER_MODEL)),
                ('seller', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sales', to=settings.AUTH_USER_MODEL)),
                ('listing', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='orders', to='api.listing')),
            ],
        ),
    ]
