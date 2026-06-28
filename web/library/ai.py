import urllib.request
import urllib.error
import json
import logging
import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.conf import settings

logger = logging.getLogger(__name__)

def log_console(msg):
    print(msg, flush=True)
    logger.info(msg)

def process_batch(batch, batch_index, total_batches, api_key, model, categories):
    log_console(f"🤖 [OpenRouter AI] Sending batch {batch_index}/{total_batches} ({len(batch)} files) to {model}...")
    start_time = time.time()
    batch_result = {}
    
    prompt = (
        "You are an expert audio sample library organizer. Categorize each audio file path/name into EXACTLY ONE of these categories:\n"
        "- drums (kicks, snares, claps, hi-hats, percussions, drum loops, breaks, cymbals, toms, bongos, rims)\n"
        "- bass (sub bass, 808s, synth bass, basslines, reese bass, acid bass, low end loops)\n"
        "- tonal (synths, leads, plucks, piano, guitar, melody loops, keys, chords, instruments, musical elements)\n"
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

    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            elapsed = round(time.time() - start_time, 2)
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                for item in batch:
                    cat = parsed.get(item, "").lower()
                    if cat in categories:
                        batch_result[item] = cat
                    else:
                        batch_result[item] = fallback_categorize(item)
                log_console(f"✅ [OpenRouter AI] Batch {batch_index}/{total_batches} finished in {elapsed}s!")
            else:
                log_console(f"⚠️ [OpenRouter AI] Batch {batch_index}/{total_batches} returned status {response.status}. Using rule fallback.")
                for item in batch:
                    batch_result[item] = fallback_categorize(item)
    except Exception as e:
        elapsed = round(time.time() - start_time, 2)
        log_console(f"❌ [OpenRouter AI] Batch {batch_index}/{total_batches} error after {elapsed}s: {e}. Using rule fallback.")
        for item in batch:
            batch_result[item] = fallback_categorize(item)
            
    return batch_result


def classify_files_with_openrouter(file_list):
    """
    Classifies a list of file path/name strings into OpenLoop categories:
    ['drums', 'bass', 'tonal', 'vocals', 'sfxs', 'ambiences'].
    Returns a dictionary mapping file string -> category string.
    """
    categories = ["drums", "bass", "tonal", "vocals", "sfxs", "ambiences"]
    result_map = {}
    
    api_key = getattr(settings, "OPENROUTER_API_KEY", None) or ""
    model = getattr(settings, "OPENROUTER_MODEL", "google/gemini-2.5-flash")
    
    if not api_key:
        log_console("⚠️ [OpenRouter AI] OPENROUTER_API_KEY is not set. Falling back to local rule-based categorization.")
        for item in file_list:
            result_map[item] = fallback_categorize(item)
        return result_map

    batch_size = 150
    batches = [file_list[i:i+batch_size] for i in range(0, len(file_list), batch_size)]
    total_batches = len(batches)
    
    log_console(f"🚀 [OpenRouter AI] Starting AI classification for {len(file_list)} files across {total_batches} batch(es) using model '{model}'...")
    
    # Process batches concurrently to dramatically speed up AI categorization
    with ThreadPoolExecutor(max_workers=min(4, total_batches)) as executor:
        futures = [
            executor.submit(process_batch, batch, idx + 1, total_batches, api_key, model, categories)
            for idx, batch in enumerate(batches)
        ]
        for future in as_completed(futures):
            res = future.result()
            result_map.update(res)

    # Calculate and log summary breakdown
    breakdown = {cat: 0 for cat in categories}
    for cat in result_map.values():
        if cat in breakdown:
            breakdown[cat] += 1
            
    summary_str = ", ".join([f"{cat.capitalize()}: {count}" for cat, count in breakdown.items()])
    log_console(f"🎉 [OpenRouter AI] Classification complete! Breakdown: {summary_str}")
    return result_map


def fallback_categorize(filename_or_path):
    fn = filename_or_path.lower()
    if any(k in fn for k in ['vocal', 'acapella', 'vox', 'phrase', 'chant', 'singing']):
        return 'vocals'
    if any(k in fn for k in ['kick', 'snare', 'clap', 'hat', 'perc', 'drum', 'toploop', 'cymbal', 'tom', 'rim', 'ride', 'crash', 'break', 'bongo']):
        return 'drums'
    if any(k in fn for k in ['bass', '808', 'sub', 'reese', 'subbass', 'bassline']):
        return 'bass'
    if any(k in fn for k in ['sfx', 'fx', 'riser', 'impact', 'downshifter', 'downlifter', 'sweep', 'foley', 'noise', 'transition', 'drop']):
        return 'sfxs'
    if any(k in fn for k in ['ambient', 'ambience', 'pad', 'texture', 'drone', 'atmosphere', 'soundscape']):
        return 'ambiences'
    if any(k in fn for k in ['synth', 'lead', 'pluck', 'piano', 'guitar', 'melody', 'key', 'chord', 'inst', 'music', 'tonal']):
        return 'tonal'
    return 'drums'
