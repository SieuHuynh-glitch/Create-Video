import math
import struct
import wave
import os

SAMPLE_RATE = 44100

def generate_pop(filepath):
    """Tạo tiếng pop ngắn 80ms với tần số giảm từ 900Hz -> 300Hz"""
    duration = 0.08
    total_samples = int(SAMPLE_RATE * duration)
    frames = bytearray()
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        freq = 900 - 600 * (t / duration)
        envelope = math.exp(-35 * t)
        sample = math.sin(2 * math.pi * freq * t) * envelope * 0.45
        val = int(sample * 32767)
        frames.extend(struct.pack('<h', max(-32767, min(32767, val))))
    
    with wave.open(filepath, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(frames)

def generate_whoosh(filepath):
    """Tạo tiếng whoosh chuyển cảnh 300ms với tần số quét 200Hz -> 800Hz -> 100Hz"""
    duration = 0.32
    total_samples = int(SAMPLE_RATE * duration)
    frames = bytearray()
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        progress = t / duration
        freq = 250 + 600 * math.sin(math.pi * progress)
        envelope = math.sin(math.pi * progress) ** 2
        sample = math.sin(2 * math.pi * freq * t) * envelope * 0.35
        val = int(sample * 32767)
        frames.extend(struct.pack('<h', max(-32767, min(32767, val))))
        
    with wave.open(filepath, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(frames)

def generate_ambient_bgm(filepath):
    """Tạo đoạn nhạc nền ambient êm dịu 30 giây (Cmaj7 / Am9)"""
    duration = 30.0
    total_samples = int(SAMPLE_RATE * duration)
    # Tần số các nốt: C3 (130.8), G3 (196.0), B3 (246.9), E4 (329.6), G4 (392.0)
    notes = [130.81, 196.00, 246.94, 329.63, 392.00]
    frames = bytearray()
    chunk_size = 4096
    
    with wave.open(filepath, 'wb') as wav:
        wav.setnchannels(2) # Stereo
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        
        chunk = bytearray()
        for i in range(total_samples):
            t = i / SAMPLE_RATE
            tremolo = 0.85 + 0.15 * math.sin(2 * math.pi * 0.3 * t)
            left = 0
            right = 0
            for idx, freq in enumerate(notes):
                detune_l = freq * (1 - 0.002 * (idx % 2))
                detune_r = freq * (1 + 0.002 * ((idx + 1) % 2))
                left += math.sin(2 * math.pi * detune_l * t) * 0.15
                right += math.sin(2 * math.pi * detune_r * t) * 0.15
            
            env = 1.0
            if t < 1.0:
                env = t
            elif t > duration - 1.0:
                env = duration - t
            
            val_l = int(left * tremolo * env * 32767 * 0.35)
            val_r = int(right * tremolo * env * 32767 * 0.35)
            chunk.extend(struct.pack('<hh', max(-32767, min(32767, val_l)), max(-32767, min(32767, val_r))))
            
            if len(chunk) >= chunk_size * 4:
                wav.writeframes(chunk)
                chunk.clear()
                
        if chunk:
            wav.writeframes(chunk)

if __name__ == '__main__':
    out_dir = os.path.join('public', 'system-audio')
    os.makedirs(out_dir, exist_ok=True)
    generate_pop(os.path.join(out_dir, 'sfx_pop.wav'))
    generate_whoosh(os.path.join(out_dir, 'sfx_whoosh.wav'))
    generate_ambient_bgm(os.path.join(out_dir, 'bgm_ambient.wav'))
    print('System audio generated successfully at:', out_dir)
