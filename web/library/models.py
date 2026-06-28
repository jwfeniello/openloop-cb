from django.db import models
from django.utils.translation import gettext_lazy as _
from django.dispatch import receiver
from django.db.models.signals import pre_save, post_save
from pathlib import Path
from taggit.managers import TaggableManager
import mutagen
import logging
import re
import urllib.parse


logger = logging.getLogger(__name__)


def get_save_path(instance, filename):
    return 'uploads/{0}/Sounds/{1}/{2}'.format(instance.pack, instance.category, filename)


def get_img_save_path(instance, filename):
    return 'uploads/{0}/Artworks/{1}'.format(instance.name, filename)


class Pack(models.Model):
    class packs(models.TextChoices):
        SAMPLEKIT = "SK", _("Sample Kit")
        PRODKIT = "PK", _("Prod. Kit")
        DRUMKIT = "DK", _("Drum Kit")

    type = models.CharField(max_length=3, choices=packs)  # type: ignore
    name = models.CharField(max_length=100, unique=True)
    author = models.CharField(max_length=100)
    cover = models.ImageField(upload_to=get_img_save_path)
    tags = TaggableManager()

    def __str__(self):
        return f"{self.name}"


class Sample(models.Model):
    class categories(models.TextChoices):
        DRUMS = "drums", _("Drums")
        BASS = "bass", _("Bass")
        TONAL = "tonal", _("Tonal")
        VOCALS = "vocals", _("Vocals")
        SFXS = "sfxs", _("Sfxs")
        AMBIENCES = "ambiences", _("Ambiences")


    # fields
    pack = models.ForeignKey(Pack, on_delete=models.CASCADE, related_name="samples", to_field="name")
    category = models.CharField(max_length=20, choices=categories)  # type: ignore
    file = models.FileField(upload_to=get_save_path)

    # composite values
    duration = models.PositiveIntegerField(blank=True, null=True)
    name = models.CharField(max_length=100, blank=True)
    peaks = models.JSONField(blank=True, null=True)
    bpm = models.PositiveIntegerField(blank=True, null=True)
    key = models.CharField(max_length=50, blank=True, null=True)

    # tags
    tags = TaggableManager()

    class Meta:
        ordering = ["name", "pack", "category"]

    def __str__(self):
        return f"{self.file}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.file:
            ext = Path(self.file.name).suffix.lower()
            valid_audio_extensions = {'.wav', '.mp3', '.ogg', '.flac', '.aif', '.aiff', '.m4a', '.mp4', '.aac', '.wma'}
            if ext not in valid_audio_extensions:
                raise ValidationError(_("File must be a valid audio file (e.g. .wav, .mp3, .flac)."))

    def save(self, *args, **kwargs):
        # if not self.pk:
        #     self.name = Path(self.file.url).name
        #     update_fields = None
        # else:
        #     update_fields = True
        super().save(*args, **kwargs)


import wave
import struct

def extract_peaks_from_file(file_obj, num_peaks=100):
    try:
        # Check if WAV file
        file_obj.seek(0)
        header = file_obj.read(12)
        if len(header) < 12 or header[:4] != b'RIFF' or header[8:12] != b'WAVE':
            # Not a WAV file, return a dummy placeholder waveform
            return [10, 20, 30, 45, 60, 75, 90, 80, 70, 55, 45, 30, 25, 35, 50, 70, 85, 60, 40, 25] * 5
            
        audio_format = None
        num_channels = None
        sample_rate = None
        bits_per_sample = None
        block_align = None
        data_offset = None
        data_size = None
        
        # Iterate through chunks
        file_obj.seek(12)
        while True:
            chunk_header = file_obj.read(8)
            if len(chunk_header) < 8:
                break
            chunk_id, chunk_size = struct.unpack('<4sI', chunk_header)
            chunk_data_offset = file_obj.tell()
            
            if chunk_id == b'fmt ':
                fmt_data = file_obj.read(chunk_size)
                if len(fmt_data) >= 16:
                    audio_format, num_channels, sample_rate, _, block_align, bits_per_sample = struct.unpack('<HHIIHH', fmt_data[:16])
                    if audio_format == 65534 and len(fmt_data) >= 40: # WAVE_FORMAT_EXTENSIBLE
                        # SubFormat is bytes 24-40 (GUID). First 2 bytes of GUID represent the subformat
                        sub_format = struct.unpack('<H', fmt_data[24:26])[0]
                        audio_format = sub_format
            elif chunk_id == b'data':
                data_offset = chunk_data_offset
                data_size = chunk_size
                # skip chunk data to read next chunks
                file_obj.seek(chunk_data_offset + chunk_size)
            else:
                # skip chunk data
                file_obj.seek(chunk_data_offset + chunk_size)
                
            # Align to 2-byte boundary
            current_pos = file_obj.tell()
            if current_pos % 2 != 0:
                file_obj.seek(current_pos + 1)
                
        if audio_format is None or data_offset is None or data_size is None or block_align is None or num_channels is None:
            # Fallback to standard wave module in case manual chunk scanning failed
            file_obj.seek(0)
            with wave.open(file_obj, 'rb') as w:
                num_frames = w.getnframes()
                sampwidth = w.getsampwidth()
                num_channels = w.getnchannels()
                if num_frames == 0:
                    return []
                chunk_size = max(1, num_frames // num_peaks)
                peaks = []
                
                frame_bytes = sampwidth * num_channels
                for i in range(num_peaks):
                    w.setpos(i * chunk_size)
                    frames_to_read = min(chunk_size, num_frames - (i * chunk_size))
                    if frames_to_read <= 0:
                        peaks.append(0)
                        continue
                    data = w.readframes(frames_to_read)
                    num_frames_read = len(data) // frame_bytes
                    if num_frames_read == 0:
                        peaks.append(0)
                        continue
                    
                    step = max(1, num_frames_read // 500)
                    max_val = 0
                    for idx in range(0, num_frames_read, step):
                        offset = idx * frame_bytes
                        sample_bytes = data[offset : offset + sampwidth]
                        if len(sample_bytes) < sampwidth:
                            break
                        
                        if sampwidth == 1:
                            val = sample_bytes[0] - 128
                        elif sampwidth == 2:
                            val = int.from_bytes(sample_bytes, byteorder='little', signed=True)
                        else:
                            val = int.from_bytes(sample_bytes, byteorder='little', signed=True)
                        
                        max_val = max(max_val, abs(val))
                    
                    if sampwidth == 1:
                        norm_val = int((max_val / 128.0) * 100)
                    elif sampwidth == 2:
                        norm_val = int((max_val / 32768.0) * 100)
                    else:
                        max_possible = 2 ** (sampwidth * 8 - 1)
                        norm_val = int((max_val / max_possible) * 100)
                    
                    peaks.append(min(100, norm_val))
                return peaks
                
        # We have the format and offset manually
        num_frames = data_size // block_align
        if num_frames == 0:
            return []
            
        chunk_size = max(1, num_frames // num_peaks)
        peaks = []
        
        # Determine bytes per sample for format
        if bits_per_sample == 8:
            byte_per_sample = 1
        elif bits_per_sample == 16:
            byte_per_sample = 2
        elif bits_per_sample == 24:
            byte_per_sample = 3
        elif bits_per_sample == 32:
            byte_per_sample = 4
        elif bits_per_sample == 64:
            byte_per_sample = 8
        else:
            return [max(5, int(85 * (0.93 ** idx) * (0.7 + 0.3 * (idx % 2)))) for idx in range(num_peaks)]
            
        for i in range(num_peaks):
            frame_start_idx = i * chunk_size
            frames_to_read = min(chunk_size, num_frames - frame_start_idx)
            if frames_to_read <= 0:
                peaks.append(0)
                continue
            
            file_obj.seek(data_offset + frame_start_idx * block_align)
            chunk_data = file_obj.read(frames_to_read * block_align)
            num_frames_read = len(chunk_data) // block_align
            if num_frames_read == 0:
                peaks.append(0)
                continue
                
            step = max(1, num_frames_read // 500)
            max_val = 0
            for idx in range(0, num_frames_read, step):
                offset = idx * block_align
                sample_bytes = chunk_data[offset : offset + byte_per_sample]
                if len(sample_bytes) < byte_per_sample:
                    break
                    
                if audio_format == 1: # PCM
                    if bits_per_sample == 8:
                        val = sample_bytes[0] - 128
                    elif bits_per_sample == 16:
                        val = int.from_bytes(sample_bytes, byteorder='little', signed=True)
                    elif bits_per_sample == 24:
                        val = int.from_bytes(sample_bytes, byteorder='little', signed=True)
                    elif bits_per_sample == 32:
                        val = int.from_bytes(sample_bytes, byteorder='little', signed=True)
                elif audio_format == 3: # Float
                    if bits_per_sample == 32:
                        val = struct.unpack('<f', sample_bytes)[0]
                    elif bits_per_sample == 64:
                        val = struct.unpack('<d', sample_bytes)[0]
                else:
                    val = 0
                
                max_val = max(max_val, abs(val))
                
            if audio_format == 1:
                if bits_per_sample == 8:
                    norm_val = int((max_val / 128.0) * 100)
                elif bits_per_sample == 16:
                    norm_val = int((max_val / 32768.0) * 100)
                elif bits_per_sample == 24:
                    norm_val = int((max_val / 8388608.0) * 100)
                elif bits_per_sample == 32:
                    norm_val = int((max_val / 2147483648.0) * 100)
            elif audio_format == 3:
                norm_val = int(min(1.0, max_val) * 100)
            else:
                norm_val = 0
                
            peaks.append(min(100, norm_val))
            
        return peaks
    except Exception as e:
        logger.error(f"Error manually parsing WAV: {e}")
        return [max(5, int(85 * (0.93 ** idx) * (0.7 + 0.3 * (idx % 2)))) for idx in range(num_peaks)]


def extract_key_and_bpm_from_name(filename):
    name_without_ext = filename.rsplit('.', 1)[0]
    
    # Normalize delimiters for BPM detection
    normalized_for_bpm = re.sub(r'[\s\-_()\[\].,:;/\\]+', ' ', name_without_ext).strip()
    
    # 1. Extract BPM
    bpm = None
    # Look for explicit BPM indicators
    bpm_match = re.search(r'\b(\d{2,3})\s*bpm\b', normalized_for_bpm, re.IGNORECASE)
    if not bpm_match:
        bpm_match = re.search(r'\bbpm\s*(\d{2,3})\b', normalized_for_bpm, re.IGNORECASE)
        
    if bpm_match:
        bpm = int(bpm_match.group(1))
    else:
        # Fallback: Look for a single standalone number in typical BPM range (60-200)
        pure_numbers = []
        tokens = normalized_for_bpm.split()
        for token in tokens:
            if re.match(r'^\d{2,3}$', token):
                val = int(token)
                if 60 <= val <= 200:
                    pure_numbers.append(val)
        
        # If there's exactly one candidate number in that range, assume it's the BPM
        if len(pure_numbers) == 1:
            bpm = pure_numbers[0]

    # 2. Extract Key
    # Split by standard delimiters except dots, to prevent S.E.3 from splitting into S, E, 3
    tokens = [t for t in re.split(r'[\s\-_()\[\]/\\:;]+', name_without_ext) if t]
    
    KEY_PATTERN = re.compile(r'^([A-G])([#b]?)(m|min|minor|maj|major|maj7)?$')
    CAMELOT_PATTERN = re.compile(r'^(1[0-2]|[1-9])[AB]$', re.IGNORECASE)
    
    key_candidates = [] # list of tuples: (key_string, level)
    
    i = 0
    while i < len(tokens):
        token = tokens[i]
        
        # Check Camelot
        if CAMELOT_PATTERN.match(token):
            key_candidates.append((token.upper(), 2))
            i += 1
            continue
            
        # Check standard key
        match = KEY_PATTERN.match(token)
        if match:
            note = match.group(1) # Uppercase letter A-G
            accidental = match.group(2) # # or b
            modifier = match.group(3) # m, min, maj, etc.
            
            # Check if next token is a modifier that can be merged
            if not modifier and i + 1 < len(tokens):
                next_token = tokens[i+1].lower()
                if next_token in ['m', 'min', 'minor', 'maj', 'major', 'maj7', 'minor7', 'major7']:
                    modifier = next_token
                    i += 1 # Consume next token
            
            # Reconstruct clean key name
            key_str = note + accidental
            if modifier:
                # Standardize common modifiers
                if modifier.lower() in ['m', 'min', 'minor']:
                    key_str += 'm'
                elif modifier.lower() in ['maj', 'major', 'maj7']:
                    key_str += 'maj'
                else:
                    key_str += modifier
            
            # Determine level
            # Level 2 (Strong): has accidental or modifier
            # Level 1 (Weak): single letter note (e.g. C, A)
            if accidental or modifier:
                level = 2
            else:
                level = 1
                
            # Filter out obvious false positives for weak single-letter keys
            is_false_positive = False
            if level == 1:
                # "A" as first token is usually the article "a" (e.g. "A Drum Loop")
                if note == 'A' and i == 0:
                    is_false_positive = True
                # "B" preceded by Vol/Volume/Version is usually an index
                elif note == 'B' and i > 0 and tokens[i-1].lower() in ['vol', 'volume', 'ver', 'version']:
                    is_false_positive = True
                # Surrounded by numbers or index indications
                elif i > 0 and tokens[i-1].lower() in ['no', 'num', 'number']:
                    is_false_positive = True
                    
            if not is_false_positive:
                key_candidates.append((key_str, level))
                
        i += 1
        
    # Select the best key
    key = None
    strong_candidates = [c[0] for c in key_candidates if c[1] == 2]
    weak_candidates = [c[0] for c in key_candidates if c[1] == 1]
    
    if strong_candidates:
        # If there are strong candidates, prioritize them. If multiple, return the first one.
        key = strong_candidates[0]
    elif len(weak_candidates) == 1:
        # Only return weak candidate if it's the only one found
        key = weak_candidates[0]
        
    return key, bpm


@receiver(pre_save, sender=Sample)
def set_composite_values(sender, instance, **kwargs):
    try:
        obj = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        instance.name = urllib.parse.unquote(Path(instance.file.url).name).replace(" ", "_")
        try:
            audio_info = mutagen.File(instance.file)
            if audio_info is not None and hasattr(audio_info, 'info') and audio_info.info is not None:
                instance.duration = round(audio_info.info.length)
            else:
                instance.duration = 0
        except Exception as e:
            logger.error(f"Error parsing audio file for duration: {e}")
            instance.duration = 0
            
        try:
            instance.file.open('rb')
            instance.peaks = extract_peaks_from_file(instance.file)
        except Exception:
            pass
        # Extract key and BPM
        key, bpm = extract_key_and_bpm_from_name(instance.name)
        instance.key = key
        instance.bpm = bpm
    else:
        if not obj.file == instance.file:
            instance.name = urllib.parse.unquote(Path(instance.file.url).name).replace(" ", "_")
            try:
                audio_info = mutagen.File(instance.file)
                if audio_info is not None and hasattr(audio_info, 'info') and audio_info.info is not None:
                    instance.duration = round(audio_info.info.length)
                else:
                    instance.duration = 0
            except Exception as e:
                logger.error(f"Error parsing audio file for duration: {e}")
                instance.duration = 0
                
            try:
                instance.file.open('rb')
                instance.peaks = extract_peaks_from_file(instance.file)
            except Exception:
                pass
            # Extract key and BPM
            key, bpm = extract_key_and_bpm_from_name(instance.name)
            instance.key = key
            instance.bpm = bpm


@receiver(post_save, sender=Sample)
def auto_tag_sample(sender, instance, created, **kwargs):
    if created:
        filename_lower = instance.name.lower()
        tags_to_add = []

        # Determine primary drum category tag
        primary_drum_tag = None
        if any(x in filename_lower for x in ['bassdrum', 'kick']):
            primary_drum_tag = 'kick'
        elif any(x in filename_lower for x in ['clap', 'snare']):
            primary_drum_tag = 'snare'
        elif any(x in filename_lower for x in ['hihat', 'hat', 'crash', 'ride']):
            primary_drum_tag = 'cymbal'
        elif any(x in filename_lower for x in ['perc', 'percussion', 'tom', 'bongo', 'rim']):
            primary_drum_tag = 'percussion'

        if primary_drum_tag:
            tags_to_add.append(primary_drum_tag)

        # Define keyword mappings for auto-tagging
        tag_mapping = {
            'kick': 'kick',
            'snare': 'snare',
            'clap': 'clap',
            'hihat': 'hihat',
            'hat': 'hihat',
            'perc': 'percussion',
            'drum': 'drums',
            'loop': 'loop',
            'synth': 'melody',
            'melody': 'melody',
            'bass': 'bass',
            'vocal': 'vocal',
            'fx': 'fx',
            'ambient': 'ambient',
            '808': '808',
            'pad': 'pad',
            'pluck': 'pluck',
            'lead': 'lead',
        }

        for keyword, tag in tag_mapping.items():
            if keyword in filename_lower:
                if tag not in tags_to_add:
                    tags_to_add.append(tag)

        if tags_to_add:
            # taggit manager requires post_save since the instance must have a pk
            instance.tags.add(*tags_to_add)
