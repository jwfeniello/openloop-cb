import urllib.request
import urllib.error
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def classify_files_with_openrouter(file_list):
    """
    Classifies a list of file path/name strings into OpenLoop categories:
    ['drums', 'tonal', 'vocals', 'sfxs', 'ambiences'].
    Returns a dictionary mapping file string -> category string.
    """
    categories = ["drums", "tonal", "vocals", "sfxs", "ambiences"]
    result_map = {}
    
    api_key = getattr(settings, "OPENROUTER_API_KEY", None) or ""
    model = getattr(settings, "OPENROUTER_MODEL", "google/gemini-2.5-flash")
    
    if not api_key:
        logger.warning("OPENROUTER_API_KEY is not configured in environment settings. Using rule-based categorization.")
        for item in file_list:
            result_map[item] = fallback_categorize(item)
        return result_map

    # Process in batches of 150 to keep request sizes manageable
    batch_size = 150
    for i in range(0, len(file_list), batch_size):
        batch = file_list[i:i+batch_size]
        try:
            prompt = (
                "You are an expert audio sample library organizer. Categorize each audio file path/name into EXACTLY ONE of these categories:\n"
                "- drums (kicks, snares, claps, hi-hats, percussions, drum loops, breaks, cymbals, toms, bongos, rims)\n"
                "- tonal (synths, bass, 808s, leads, plucks, piano, guitar, melody loops, keys, chords, instruments, musical elements)\n"
                "- vocals (vocal chops, acapellas, voice lines, phrases, vocal hooks, spoken word)\n"
                "- sfxs (risers, impacts, downlifters, foley, transition effects, glitches, sweeps, noise, drops, hits)\n"
                "- ambiences (textures, pads, atmosphere, background hums, drones, soundscapes)\n\n"
                "Return ONLY a valid JSON object mapping each exact input file string to its category name string.\n\n"
                f"Files to classify:\n{json.dumps(batch)}"
            )

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/jwfeniello/openloop-cb",
                "X-Title": "OpenLoop Sample Manager",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }

            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"}
            }

            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=json.dumps(payload).encode('utf-8'),
                headers=headers,
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    for item in batch:
                        cat = parsed.get(item, "").lower()
                        if cat in categories:
                            result_map[item] = cat
                        else:
                            result_map[item] = fallback_categorize(item)
                else:
                    for item in batch:
                        result_map[item] = fallback_categorize(item)

        except Exception as e:
            logger.error(f"Error calling OpenRouter API: {e}")
            for item in batch:
                result_map[item] = fallback_categorize(item)
                
    return result_map

def fallback_categorize(filename_or_path):
    fn = filename_or_path.lower()
    if any(k in fn for k in ['vocal', 'acapella', 'vox', 'phrase', 'chant', 'singing']):
        return 'vocals'
    if any(k in fn for k in ['kick', 'snare', 'clap', 'hat', 'perc', 'drum', 'toploop', 'cymbal', 'tom', 'rim', 'ride', 'crash', 'break', 'bongo']):
        return 'drums'
    if any(k in fn for k in ['sfx', 'fx', 'riser', 'impact', 'downshifter', 'downlifter', 'sweep', 'foley', 'noise', 'transition', 'drop']):
        return 'sfxs'
    if any(k in fn for k in ['ambient', 'ambience', 'pad', 'texture', 'drone', 'atmosphere', 'soundscape']):
        return 'ambiences'
    if any(k in fn for k in ['synth', 'bass', '808', 'lead', 'pluck', 'piano', 'guitar', 'melody', 'key', 'chord', 'inst', 'music', 'tonal']):
        return 'tonal'
    return 'drums'
