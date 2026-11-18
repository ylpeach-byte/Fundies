// Prepare the recorded whistle without playing it during a user gesture.
const whistle = (() => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let context;
  let buffer;
  let ready;
  let source;
  let cue = 0;

  function unlock() {
    if (!AudioContext) return;
    context ??= new AudioContext();
    ready = context.state === 'running'
      ? Promise.resolve()
      : context.resume().catch(error => console.warn('Whistle audio:', error));
    buffer ??= fetch('./referee-whistle.wav')
      .then(response => {
        if (!response.ok) throw new Error('Whistle recording unavailable');
        return response.arrayBuffer();
      })
      .then(bytes => context.decodeAudioData(bytes))
      .catch(error => {
        buffer = undefined;
        console.warn('Whistle audio:', error);
      });
  }

  function cancel() {
    cue++;
    if (source) {
      source.stop();
      source = undefined;
    }
  }

  function play() {
    if (!buffer) return;
    cancel();
    const currentCue = cue;
    Promise.all([buffer, ready]).then(([recording]) => {
      if (!recording || currentCue !== cue || context.state !== 'running') return;
      const next = context.createBufferSource();
      next.buffer = recording;
      next.connect(context.destination);
      next.onended = () => {
        next.disconnect();
        if (source === next) source = undefined;
      };
      source = next;
      next.start();
    }).catch(error => console.warn('Whistle audio:', error));
  }

  function addTestButton(testWhistle) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'control';
    button.textContent = '♫ Test Whistle';
    button.setAttribute('aria-label', 'Test referee whistle');
    button.addEventListener('click', testWhistle);
    document.getElementById('sound').insertAdjacentElement('afterend', button);
  }

  window.addEventListener('pagehide', cancel);
  return { unlock, cancel, play, addTestButton };
})();
