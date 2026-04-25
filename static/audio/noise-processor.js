/* eslint-disable */
class NoiseProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.type = options?.processorOptions?.type || 'white';
    this.last = 0;
  }

  process(inputs, outputs) {
    const output = outputs[0][0];

    for (let i = 0; i < output.length; i += 1) {
      const white = Math.random() * 2 - 1;

      if (this.type === 'white') {
        output[i] = white;
      } else if (this.type === 'pink') {
        this.last = 0.98 * this.last + 0.02 * white;
        output[i] = this.last * 5;
      } else {
        this.last = this.last + white * 0.02;
        this.last = Math.max(-1, Math.min(1, this.last));
        output[i] = this.last;
      }
    }

    return true;
  }
}

registerProcessor('noise-processor', NoiseProcessor);
