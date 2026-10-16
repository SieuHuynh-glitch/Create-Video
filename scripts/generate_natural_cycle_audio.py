import math
import struct
import wave
import random
import os

SAMPLE_RATE = 44100
OUT_DIR = "runs/natural-cycle/audio"

def synthesize_master_soundtrack():
    duration = 120.0
    total_samples = int(SAMPLE_RATE * duration)
    frames = bytearray()
    chunk_size = 4096
    
    os.makedirs(OUT_DIR, exist_ok=True)
    master_path = os.path.join(OUT_DIR, "bgm_natural_cycle.wav")
    
    # Random noise state for organic textures
    random.seed(42)
    noise_buffer = [random.uniform(-1, 1) for _ in range(SAMPLE_RATE)]
    
    with wave.open(master_path, 'wb') as wav:
        wav.setnchannels(2) # Stereo
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        
        chunk = bytearray()
        for i in range(total_samples):
            t = i / SAMPLE_RATE
            
            # --- 1. Base Atmospheric Sub Drone (45Hz & 55Hz) ---
            sub_pulse = 0.85 + 0.15 * math.sin(2 * math.pi * 0.15 * t)
            sub = (math.sin(2 * math.pi * 45.0 * t) + 0.7 * math.sin(2 * math.pi * 55.0 * t)) * 0.25 * sub_pulse
            
            # --- 2. Cold Wind Texture (Filtered noise) ---
            noise_idx = i % len(noise_buffer)
            wind_env = 0.5 + 0.5 * math.sin(2 * math.pi * 0.08 * t)
            wind = noise_buffer[noise_idx] * 0.04 * wind_env
            
            # --- 3. Musical Drone Layers (D-minor modal pad: D2=73.4, A2=110, D3=146.8, F3=174.6) ---
            chord_t = 0.0
            # Evolve chord amplitude according to the film's emotional arc
            if t < 8.0:
                # Opening Title: Fade in quietly
                amp = (t / 8.0) * 0.4
            elif t < 20.0:
                # Skull Appearance: Stable mysterious drone
                amp = 0.45
            elif t < 38.0:
                # Cracking: Drone recedes slightly to let crack sounds cut through
                amp = 0.35
            elif t < 50.0:
                # Soil Rises: Deeper, low-frequency presence
                amp = 0.4
            elif t < 72.0:
                # Seedling: Subtle warmth, rising melodic pulse
                amp = 0.5 + 0.1 * math.sin(2 * math.pi * 0.8 * (t - 50))
            elif t < 90.0:
                # Tree Growth: Rich swell
                progress = (t - 72.0) / 18.0
                amp = 0.5 + 0.35 * progress
            elif t < 104.0:
                # Skull Fruits: Climax tension then brief stillness
                if t < 98.0:
                    amp = 0.75
                else:
                    amp = 0.3 # Stillness when fruits settle
            elif t < 114.0:
                # Fruit Falls: Tapering down
                amp = 0.35 * (1.0 - (t - 104.0) / 15.0)
            else:
                # Loop Return & The End: Deep resolving bell tone fading to silence
                rem = (120.0 - t) / 6.0
                amp = 0.4 * rem
                
            freqs = [73.42, 110.0, 146.83, 174.61, 220.0]
            chord_l = 0.0
            chord_r = 0.0
            for idx, f in enumerate(freqs):
                l_phase = 2 * math.pi * f * (1 - 0.0015 * idx) * t
                r_phase = 2 * math.pi * f * (1 + 0.0015 * idx) * t
                chord_l += math.sin(l_phase) * 0.15
                chord_r += math.sin(r_phase) * 0.15
                
            # --- 4. Scene-Specific Organic SFX Layers ---
            sfx = 0.0
            
            # Cracking impulses (t=20s to 38s)
            if 20.0 <= t <= 38.0:
                # Periodic sharp micro-cracks
                crack_cycle = (t - 20.0) % 2.5
                if crack_cycle < 0.12:
                    crack_env = math.exp(-30.0 * crack_cycle)
                    sfx += math.sin(2 * math.pi * 1400.0 * crack_cycle) * crack_env * 0.35
            
            # Earthy soil rumble (t=38s to 50s)
            if 38.0 <= t <= 50.0:
                rumble_env = math.sin(math.pi * (t - 38.0) / 12.0)
                sfx += (math.sin(2 * math.pi * 32.0 * t) + noise_buffer[noise_idx] * 0.08) * rumble_env * 0.25
                
            # Branch snap (t=104.2s)
            if 104.2 <= t <= 104.6:
                snap_dt = t - 104.2
                snap_env = math.exp(-45.0 * snap_dt)
                sfx += math.sin(2 * math.pi * 950.0 * snap_dt) * snap_env * 0.45
            
            # Combine all tracks
            out_l = (sub * 0.6 + wind * 0.5 + chord_l * amp + sfx) * 0.75
            out_r = (sub * 0.6 + wind * 0.5 + chord_r * amp + sfx) * 0.75
            
            # Master Fade in / Fade out
            if t < 1.5:
                master_env = t / 1.5
            elif t > 118.0:
                master_env = max(0.0, (120.0 - t) / 2.0)
            else:
                master_env = 1.0
                
            val_l = int(out_l * master_env * 32767)
            val_r = int(out_r * master_env * 32767)
            
            chunk.extend(struct.pack('<hh', max(-32767, min(32767, val_l)), max(-32767, min(32767, val_r))))
            
            if len(chunk) >= chunk_size * 4:
                wav.writeframes(chunk)
                chunk.clear()
                
        if chunk:
            wav.writeframes(chunk)
            
    print(f"Synthesized 120s master soundtrack: {master_path}")

def split_scene_audio_tracks():
    """Tạo các file audio riêng cho từng cảnh từ 0 đến 120s để tương thích với build_timeline và MainVideo"""
    scenes_duration = [
        ("scene_01", 8.0),   # 0s - 8s (Title)
        ("scene_02", 12.0),  # 8s - 20s (Skull)
        ("scene_03", 18.0),  # 20s - 38s (Cracking)
        ("scene_04", 12.0),  # 38s - 50s (Soil)
        ("scene_05", 12.0),  # 50s - 62s (Seedling)
        ("scene_06", 10.0),  # 62s - 72s (Zoom Seedling)
        ("scene_07", 18.0),  # 72s - 90s (Tree Growing)
        ("scene_08", 14.0),  # 90s - 104s (4 Skull Fruits)
        ("scene_09", 10.0),  # 104s - 114s (Fruit Falling)
        ("scene_10", 6.0),   # 114s - 120s (Return Loop & End)
    ]
    
    master_path = os.path.join(OUT_DIR, "bgm_natural_cycle.wav")
    with wave.open(master_path, 'rb') as master_wav:
        channels = master_wav.getnchannels()
        sampwidth = master_wav.getsampwidth()
        framerate = master_wav.getframerate()
        
        current_sample = 0
        for scene_id, dur_sec in scenes_duration:
            num_frames = int(dur_sec * framerate)
            scene_frames = master_wav.readframes(num_frames)
            
            scene_path = os.path.join(OUT_DIR, f"{scene_id}.wav")
            with wave.open(scene_path, 'wb') as scene_wav:
                scene_wav.setnchannels(channels)
                scene_wav.setsampwidth(sampwidth)
                scene_wav.setframerate(framerate)
                scene_wav.writeframes(scene_frames)
                
            # Create matching empty/ambient .vtt subtitle file (since this is instrumental art film)
            vtt_path = os.path.join(OUT_DIR, f"{scene_id}.vtt")
            with open(vtt_path, 'w', encoding='utf-8') as f:
                f.write("WEBVTT\n\n")
                
            print(f"Created {scene_id}.wav ({dur_sec}s) and {scene_id}.vtt")

if __name__ == '__main__':
    synthesize_master_soundtrack()
    split_scene_audio_tracks()
