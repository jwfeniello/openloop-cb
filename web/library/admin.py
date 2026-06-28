from typing import Any
from django.contrib import admin, messages
from django.urls import path
from django.http import HttpResponseRedirect, StreamingHttpResponse
from .forms import PackForm
from django.conf import settings
from taggit.managers import TaggableManager
from taggit.models import Tag
from pathlib import Path
import json

# Register your models here.
from .models import Pack, Sample, extract_key_and_bpm_from_name
from .ai import classify_files_with_openrouter

import logging


logger = logging.getLogger(__name__)


class SampleAdminInline(admin.TabularInline):
    model = Sample


@admin.register(Pack)
class PackAdmin(admin.ModelAdmin):
    form = PackForm
    list_display = ('name', 'author', 'type')
    search_fields = ('name', 'author')
    actions = ['rescan_key_bpm', 'auto_categorize_ai']

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('rescan-all/', self.admin_site.admin_view(self.rescan_all_view), name='pack-rescan-all'),
            path('add/stream-upload/', self.admin_site.admin_view(self.stream_upload_view), name='pack-stream-upload'),
            path('<path:object_id>/change/stream-upload/', self.admin_site.admin_view(self.stream_upload_view), name='pack-stream-upload-change'),
        ]
        return custom_urls + urls

    def stream_upload_view(self, request):
        def event_generator():
            try:
                form = PackForm(request.POST, request.FILES)
                if not form.is_valid():
                    err_msg = ", ".join([f"{k}: {v[0]}" for k, v in form.errors.items()])
                    yield json.dumps({"status": "error", "message": f"Form validation failed: {err_msg}"}) + "\n"
                    return

                yield json.dumps({"status": "progress", "step": "saving_pack", "percent": 5, "message": "📦 Creating Pack metadata record..."}) + "\n"
                
                pack = form.save()
                jtags = set()
                raw_tags = request.POST.get("tags", "")
                if raw_tags:
                    for i in raw_tags.split(","):
                        if i.strip():
                            jtags.add(str(i).strip())
                
                valid_audio_extensions = {'.wav', '.mp3', '.ogg', '.flac', '.aif', '.aiff', '.m4a', '.mp4', '.aac', '.wma'}
                uploaded_files = request.FILES.getlist('pack_files') or request.FILES.getlist('auto_upload')
                valid_files = [f for f in uploaded_files if Path(f.name).suffix.lower() in valid_audio_extensions]
                total_files = len(valid_files)

                if total_files > 0:
                    yield json.dumps({"status": "progress", "step": "ai_categorizing", "percent": 20, "message": f"🤖 Categorizing {total_files} samples using OpenRouter AI..."}) + "\n"
                    
                    file_paths = [f.name for f in valid_files]
                    classification = classify_files_with_openrouter(file_paths)
                    
                    yield json.dumps({"status": "progress", "step": "saving_samples", "percent": 35, "message": f"💾 AI categorization complete. Saving {total_files} samples to database..."}) + "\n"
                    
                    cat_counts = {}
                    for idx, f in enumerate(valid_files, start=1):
                        cat = classification.get(f.name, 'drums')
                        cat_counts[cat] = cat_counts.get(cat, 0) + 1
                        instance = Sample(file=f, pack=pack, category=cat)
                        instance.save()
                        if jtags:
                            instance.tags.add(*jtags)
                        
                        if idx % 5 == 0 or idx == total_files:
                            pct = int(35 + (idx / total_files) * 60)
                            yield json.dumps({
                                "status": "progress",
                                "step": "saving_samples",
                                "percent": pct,
                                "current": idx,
                                "total": total_files,
                                "message": f"💾 Processing samples & waveforms ({idx}/{total_files})..."
                            }) + "\n"
                    
                    summary = ", ".join([f"{c.capitalize()}: {n}" for c, n in cat_counts.items()])
                    msg = f"Successfully uploaded and AI-categorized {total_files} samples for '{pack.name}' ({summary})."
                    messages.success(request, msg)
                else:
                    messages.success(request, f"Successfully created Pack '{pack.name}'.")

                yield json.dumps({
                    "status": "complete",
                    "percent": 100,
                    "message": "🎉 All done! Redirecting...",
                    "redirect_url": "/admin/library/pack/"
                }) + "\n"

            except Exception as e:
                logger.error(f"Error during stream_upload_view: {e}")
                yield json.dumps({"status": "error", "message": f"Server error: {str(e)}"}) + "\n"

        response = StreamingHttpResponse(event_generator(), content_type='application/x-ndjson')
        response['X-Accel-Buffering'] = 'no'
        response['Cache-Control'] = 'no-cache'
        return response


    def save_model(self, request: Any, obj: Any, form: Any, change: Any) -> None:
        super().save_model(request, obj, form, change)
        jtags = set()
        raw_tags = request.POST.get("tags", "")
        if raw_tags:
            for i in raw_tags.split(","):
                if i.strip():
                    jtags.add(str(i).strip())
        
        valid_audio_extensions = {'.wav', '.mp3', '.ogg', '.flac', '.aif', '.aiff', '.m4a', '.mp4', '.aac', '.wma'}
        
        # 1. Single Pack Folder Dropzone (Auto-Categorized via AI / Rules)
        uploaded_files = request.FILES.getlist('pack_files') or request.FILES.getlist('auto_upload')
        if uploaded_files:
            valid_files = [f for f in uploaded_files if Path(f.name).suffix.lower() in valid_audio_extensions]
            total_count = len(valid_files)
            if valid_files:
                file_paths = [f.name for f in valid_files]
                classification = classify_files_with_openrouter(file_paths)
                
                print(f"💾 [Database] Saving {total_count} files for pack '{obj.name}'...", flush=True)
                cat_counts = {}
                for idx, f in enumerate(valid_files, start=1):
                    cat = classification.get(f.name, 'drums')
                    cat_counts[cat] = cat_counts.get(cat, 0) + 1
                    instance = Sample(file=f, pack=obj, category=cat)
                    instance.save()
                    if jtags:
                        instance.tags.add(*jtags)
                    if idx % 25 == 0 or idx == total_count:
                        print(f"💾 [Database] Saved {idx}/{total_count} samples...", flush=True)
                
                summary = ", ".join([f"{c.capitalize()}: {n}" for c, n in cat_counts.items()])
                self.message_user(
                    request,
                    f"Successfully uploaded and AI-categorized {total_count} samples for '{obj.name}' ({summary})."
                )

        # 2. Fallback check for any legacy manual fields if used via API
        for v, n in Sample.categories.choices:
            files = request.FILES.getlist(n.lower())
            for f in files:
                ext = Path(f.name).suffix.lower()
                if ext not in valid_audio_extensions:
                    logger.info(f"Skipping non-audio file: {f.name}")
                    continue
                instance = Sample(file=f, pack=obj, category=v)
                instance.save()
                if jtags:
                    instance.tags.add(*jtags)



    @admin.action(description="Auto-categorize samples with OpenRouter AI")
    def auto_categorize_ai(self, request, queryset):
        samples_to_update = []
        all_samples = []
        for pack in queryset:
            all_samples.extend(list(pack.samples.all()))
        if all_samples:
            file_paths = [s.name or Path(s.file.name).name for s in all_samples]
            classification = classify_files_with_openrouter(file_paths)
            for sample in all_samples:
                key_name = sample.name or Path(sample.file.name).name
                new_cat = classification.get(key_name)
                if new_cat and new_cat != sample.category:
                    sample.category = new_cat
                    samples_to_update.append(sample)
            if samples_to_update:
                Sample.objects.bulk_update(samples_to_update, ['category'], batch_size=500)
        self.message_user(
            request,
            f"Successfully re-categorized {len(samples_to_update)} samples across selected packs with OpenRouter AI."
        )

    @admin.action(description="Rescan Key & BPM for selected packs")
    def rescan_key_bpm(self, request, queryset):
        samples_to_update = []
        for pack in queryset:
            for sample in pack.samples.all():
                name = sample.name
                if not name and sample.file:
                    name = Path(sample.file.name).name
                if name:
                    key, bpm = extract_key_and_bpm_from_name(name)
                    sample.key = key
                    sample.bpm = bpm
                    samples_to_update.append(sample)
        if samples_to_update:
            Sample.objects.bulk_update(samples_to_update, ['key', 'bpm'], batch_size=500)
        self.message_user(
            request,
            f"Successfully rescanned Key & BPM for {len(samples_to_update)} samples in the selected packs."
        )



    def rescan_all_view(self, request):
        samples = Sample.objects.all()
        samples_to_update = []
        for sample in samples:
            name = sample.name
            if not name and sample.file:
                name = Path(sample.file.name).name
            if name:
                key, bpm = extract_key_and_bpm_from_name(name)
                sample.key = key
                sample.bpm = bpm
                samples_to_update.append(sample)
        if samples_to_update:
            Sample.objects.bulk_update(samples_to_update, ['key', 'bpm'], batch_size=500)
        self.message_user(
            request,
            f"Successfully rescanned Key & BPM for all {len(samples_to_update)} samples in the system."
        )
        return HttpResponseRedirect("../")


@admin.register(Sample)
class SampleAdmin(admin.ModelAdmin):
    list_display = ('name', 'pack', 'category', 'bpm', 'key', 'duration')
    list_filter = ('pack', 'category', 'key')
    search_fields = ('name', 'pack__name')
    actions = ['rescan_key_bpm', 'auto_categorize_ai']

    @admin.action(description="Auto-categorize selected samples with OpenRouter AI")
    def auto_categorize_ai(self, request, queryset):
        samples_to_update = []
        all_samples = list(queryset)
        if all_samples:
            file_paths = [s.name or Path(s.file.name).name for s in all_samples]
            classification = classify_files_with_openrouter(file_paths)
            for sample in all_samples:
                key_name = sample.name or Path(sample.file.name).name
                new_cat = classification.get(key_name)
                if new_cat and new_cat != sample.category:
                    sample.category = new_cat
                    samples_to_update.append(sample)
            if samples_to_update:
                Sample.objects.bulk_update(samples_to_update, ['category'], batch_size=500)
        self.message_user(
            request,
            f"Successfully re-categorized {len(samples_to_update)} samples with OpenRouter AI."
        )


    @admin.action(description="Rescan Key & BPM for selected samples")
    def rescan_key_bpm(self, request, queryset):
        samples_to_update = []
        for sample in queryset:
            name = sample.name
            if not name and sample.file:
                name = Path(sample.file.name).name
            if name:
                key, bpm = extract_key_and_bpm_from_name(name)
                sample.key = key
                sample.bpm = bpm
                samples_to_update.append(sample)
        if samples_to_update:
            Sample.objects.bulk_update(samples_to_update, ['key', 'bpm'], batch_size=500)
        self.message_user(
            request,
            f"Successfully rescanned Key & BPM for {len(samples_to_update)} samples."
        )

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('rescan-all/', self.admin_site.admin_view(self.rescan_all_view), name='sample-rescan-all'),
        ]
        return custom_urls + urls

    def rescan_all_view(self, request):
        samples = Sample.objects.all()
        samples_to_update = []
        for sample in samples:
            name = sample.name
            if not name and sample.file:
                name = Path(sample.file.name).name
            if name:
                key, bpm = extract_key_and_bpm_from_name(name)
                sample.key = key
                sample.bpm = bpm
                samples_to_update.append(sample)
        if samples_to_update:
            Sample.objects.bulk_update(samples_to_update, ['key', 'bpm'], batch_size=500)
        self.message_user(
            request,
            f"Successfully rescanned Key & BPM for all {len(samples_to_update)} samples in the system."
        )
        return HttpResponseRedirect("../")

