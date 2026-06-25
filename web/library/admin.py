from typing import Any
from django.contrib import admin
from django.urls import path
from django.http import HttpResponseRedirect
from .forms import PackForm
from django.conf import settings
from taggit.managers import TaggableManager
from taggit.models import Tag
from pathlib import Path

# Register your models here.
from .models import Pack, Sample, extract_key_and_bpm_from_name

import logging


logger = logging.getLogger(__name__)


class SampleAdminInline(admin.TabularInline):
    model = Sample


@admin.register(Pack)
class PackAdmin(admin.ModelAdmin):
    form = PackForm
    list_display = ('name', 'author', 'type')
    search_fields = ('name', 'author')
    actions = ['rescan_key_bpm']

    def save_model(self, request: Any, obj: Any, form: Any, change: Any) -> None:
        super().save_model(request, obj, form, change)
        jtags = set()
        for i in request.POST["tags"].split(","):
            jtags.add(str(i).replace(" ", ""))
        
        valid_audio_extensions = {'.wav', '.mp3', '.ogg', '.flac', '.aif', '.aiff', '.m4a', '.mp4', '.aac', '.wma'}
        
        for v, n in Sample.categories.choices:
            files = request.FILES.getlist(n.lower())
            for f in files:
                ext = Path(f.name).suffix.lower()
                if ext not in valid_audio_extensions:
                    logger.info(f"Skipping non-audio file: {f.name}")
                    continue
                instance = Sample(file=f, pack=obj, category=v)
                instance.save()
                instance.tags.add(*jtags)

    @admin.action(description="Rescan Key & BPM for selected packs")
    def rescan_key_bpm(self, request, queryset):
        samples_updated = 0
        for pack in queryset:
            for sample in pack.samples.all():
                name = sample.name
                if not name and sample.file:
                    name = Path(sample.file.name).name
                if name:
                    key, bpm = extract_key_and_bpm_from_name(name)
                    sample.key = key
                    sample.bpm = bpm
                    sample.save(update_fields=['key', 'bpm'])
                    samples_updated += 1
        self.message_user(
            request,
            f"Successfully rescanned Key & BPM for {samples_updated} samples in the selected packs."
        )

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('rescan-all/', self.admin_site.admin_view(self.rescan_all_view), name='pack-rescan-all'),
        ]
        return custom_urls + urls

    def rescan_all_view(self, request):
        samples = Sample.objects.all()
        samples_updated = 0
        for sample in samples:
            name = sample.name
            if not name and sample.file:
                name = Path(sample.file.name).name
            if name:
                key, bpm = extract_key_and_bpm_from_name(name)
                sample.key = key
                sample.bpm = bpm
                sample.save(update_fields=['key', 'bpm'])
                samples_updated += 1
        self.message_user(
            request,
            f"Successfully rescanned Key & BPM for all {samples_updated} samples in the system."
        )
        return HttpResponseRedirect("../")


@admin.register(Sample)
class SampleAdmin(admin.ModelAdmin):
    list_display = ('name', 'pack', 'category', 'bpm', 'key', 'duration')
    list_filter = ('pack', 'category', 'key')
    search_fields = ('name', 'pack__name')
    actions = ['rescan_key_bpm']

    @admin.action(description="Rescan Key & BPM for selected samples")
    def rescan_key_bpm(self, request, queryset):
        samples_updated = 0
        for sample in queryset:
            name = sample.name
            if not name and sample.file:
                name = Path(sample.file.name).name
            if name:
                key, bpm = extract_key_and_bpm_from_name(name)
                sample.key = key
                sample.bpm = bpm
                sample.save(update_fields=['key', 'bpm'])
                samples_updated += 1
        self.message_user(
            request,
            f"Successfully rescanned Key & BPM for {samples_updated} samples."
        )

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('rescan-all/', self.admin_site.admin_view(self.rescan_all_view), name='sample-rescan-all'),
        ]
        return custom_urls + urls

    def rescan_all_view(self, request):
        samples = Sample.objects.all()
        samples_updated = 0
        for sample in samples:
            name = sample.name
            if not name and sample.file:
                name = Path(sample.file.name).name
            if name:
                key, bpm = extract_key_and_bpm_from_name(name)
                sample.key = key
                sample.bpm = bpm
                sample.save(update_fields=['key', 'bpm'])
                samples_updated += 1
        self.message_user(
            request,
            f"Successfully rescanned Key & BPM for all {samples_updated} samples in the system."
        )
        return HttpResponseRedirect("../")

