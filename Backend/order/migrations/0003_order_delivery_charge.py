# Generated for delivery charge feature
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('order', '0002_orderitem_color_name_orderitem_ram_orderitem_storage_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='delivery_charge',
            field=models.DecimalField(decimal_places=2, default=80, max_digits=12),
        ),
    ]
