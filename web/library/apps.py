from django.apps import AppConfig
from django.db.models.signals import post_migrate

def create_pack_uploaders_group(sender, **kwargs):
    from django.contrib.auth.models import Group, Permission
    try:
        group, created = Group.objects.get_or_create(name='Pack Uploaders')
        if created or not group.permissions.exists():
            perms = Permission.objects.filter(
                content_type__app_label__in=['library', 'taggit'],
                codename__in=[
                    'add_pack', 'change_pack', 'view_pack',
                    'add_sample', 'change_sample', 'view_sample',
                    'add_tag', 'change_tag', 'view_tag'
                ]
            )
            group.permissions.set(perms)
    except Exception:
        pass

class LibraryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'library'

    def ready(self):
        post_migrate.connect(create_pack_uploaders_group, sender=self)
