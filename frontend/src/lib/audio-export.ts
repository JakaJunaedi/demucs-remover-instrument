export async function exportCustomMix(
  vocalsUrl: string, 
  instrumentalUrl: string, 
  vocalsVolume: number, 
  instrumentalVolume: number,
  vocalsMuted: boolean,
  instrumentalMuted: boolean
): Promise<Blob> {
  // Fetch both audio files
  const [vocalsRes, instrumentalRes] = await Promise.all([
    fetch(vocalsUrl),
    fetch(instrumentalUrl)
  ]);
  
  const vocalsArrayBuffer = await vocalsRes.arrayBuffer();
  const instrumentalArrayBuffer = await instrumentalRes.arrayBuffer();

  const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const vocalsBuffer = await actx.decodeAudioData(vocalsArrayBuffer);
  const instrumentalBuffer = await actx.decodeAudioData(instrumentalArrayBuffer);
  
  // Use OfflineAudioContext for rendering
  const length = Math.max(vocalsBuffer.length, instrumentalBuffer.length);
  const offlineCtx = new OfflineAudioContext(2, length, vocalsBuffer.sampleRate);
  
  const vocalsSource = offlineCtx.createBufferSource();
  vocalsSource.buffer = vocalsBuffer;
  const vocalsGain = offlineCtx.createGain();
  vocalsGain.gain.value = vocalsMuted ? 0 : vocalsVolume;
  vocalsSource.connect(vocalsGain);
  vocalsGain.connect(offlineCtx.destination);
  
  const instSource = offlineCtx.createBufferSource();
  instSource.buffer = instrumentalBuffer;
  const instGain = offlineCtx.createGain();
  instGain.gain.value = instrumentalMuted ? 0 : instrumentalVolume;
  instSource.connect(instGain);
  instGain.connect(offlineCtx.destination);
  
  vocalsSource.start();
  instSource.start();
  
  const renderedBuffer = await offlineCtx.startRendering();
  
  return audioBufferToWav(renderedBuffer);
}

export async function exportCustomMix4Stems(
  urls: Record<string, string>,
  volumes: Record<string, number>,
  mutes: Record<string, boolean>
): Promise<Blob> {
  const stems = Object.keys(urls);
  
  // Fetch all audio files in parallel
  const fetchPromises = stems.map(stem => fetch(urls[stem]).then(res => res.arrayBuffer()));
  const arrayBuffers = await Promise.all(fetchPromises);
  
  const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Decode all audio data
  const decodePromises = arrayBuffers.map(buffer => actx.decodeAudioData(buffer));
  const audioBuffers = await Promise.all(decodePromises);
  
  // Use OfflineAudioContext for rendering
  const maxLength = Math.max(...audioBuffers.map(b => b.length));
  // Use max sample rate from buffers, default to 44100
  const sampleRate = audioBuffers[0]?.sampleRate || 44100;
  
  const offlineCtx = new OfflineAudioContext(2, maxLength, sampleRate);
  
  // Create and connect sources and gains
  stems.forEach((stem, index) => {
    const buffer = audioBuffers[index];
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    
    const gain = offlineCtx.createGain();
    gain.gain.value = mutes[stem] ? 0 : volumes[stem];
    
    source.connect(gain);
    gain.connect(offlineCtx.destination);
    
    source.start();
  });
  
  const renderedBuffer = await offlineCtx.startRendering();
  
  return audioBufferToWav(renderedBuffer);
}

// Minimal AudioBuffer to WAV converter
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  
  const channels = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"
  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit
  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset])); 
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true); 
      pos += 2;
    }
    offset++;
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true); pos += 2;
  }
  function setUint32(data: number) {
    view.setUint32(pos, data, true); pos += 4;
  }

  return new Blob([out], { type: "audio/wav" });
}
