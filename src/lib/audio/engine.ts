import type { NoiseType } from '../models';

export interface NoiseGenerator {
	start(): Promise<void>;
	stop(): void;
	setVolume(volume: number): void;
	setEndedCallback?(callback: () => void): void;
}

let workletModuleLoaded: Promise<void> | null = null;

function loadNoiseWorkletModule(context: AudioContext): Promise<void> {
	if (!('audioWorklet' in context)) {
		return Promise.reject(new Error('AudioWorklet not supported'));
	}

	if (workletModuleLoaded) {
		return workletModuleLoaded;
	}

	const source = `
class NoiseProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super();
		this.type = options.processorOptions?.type || 'white';
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
`;

	const blob = new Blob([source], { type: 'application/javascript' });
	const url = URL.createObjectURL(blob);
	workletModuleLoaded = context.audioWorklet.addModule(url).then(() => {
		URL.revokeObjectURL(url);
	});

	return workletModuleLoaded;
}

function createScriptNoiseNode(context: AudioContext, type: NoiseType): ScriptProcessorNode {
	const node = context.createScriptProcessor(4096, 0, 1);
	let last = 0;

	node.onaudioprocess = (event) => {
		const output = event.outputBuffer.getChannelData(0);

		for (let i = 0; i < output.length; i += 1) {
			const white = Math.random() * 2 - 1;

			if (type === 'white') {
				output[i] = white;
			} else if (type === 'pink') {
				last = 0.98 * last + 0.02 * white;
				output[i] = last * 5;
			} else {
				last = last + white * 0.02;
				last = Math.max(-1, Math.min(1, last));
				output[i] = last;
			}
		}
	};

	return node;
}

export class NapTimeAudioEngine {
	private context: AudioContext | null = null;

	private get audioContext(): AudioContext {
		if (!this.context) {
			this.context = new AudioContext();
		}

		return this.context;
	}

	createNoiseGenerator(type: NoiseType, volume = 0.5): NoiseGenerator {
		const context = this.audioContext;
		const gain = context.createGain();
		let source: AudioNode | null = createScriptNoiseNode(context, type);
		let ready = Promise.resolve();

		if ('audioWorklet' in context) {
			ready = loadNoiseWorkletModule(context)
				.then(() => {
					const worklet = new AudioWorkletNode(context, 'noise-processor', {
						processorOptions: { type }
					});
					worklet.connect(gain);
					if (source) {
						source.disconnect();
					}
					source = worklet;
				})
				.catch(() => {
					if (!source) {
						source = createScriptNoiseNode(context, type);
						source.connect(gain);
					}
				});
		}

		const fadeTime = 0.1;
		gain.gain.value = 0;
		if (source) {
			source.connect(gain);
		}
		gain.connect(context.destination);

		function fadeTo(target: number, duration = fadeTime) {
			const now = context.currentTime;
			gain.gain.cancelScheduledValues(now);
			gain.gain.setValueAtTime(gain.gain.value, now);
			gain.gain.linearRampToValueAtTime(target, now + duration);
		}

		return {
			async start() {
				if (context.state === 'suspended') {
					await context.resume();
				}
				await ready;
				fadeTo(volume);
			},
			stop() {
				fadeTo(0);
				window.setTimeout(
					() => {
						if (source) {
							source.disconnect();
						}
					},
					fadeTime * 1000 + 20
				);
			},
			setVolume(nextVolume: number) {
				fadeTo(nextVolume);
			}
		};
	}

	createMediaPlayer(url: string, volume = 0.5, loop = false): NoiseGenerator {
		const context = this.audioContext;
		const audio = new Audio(url);
		audio.crossOrigin = 'anonymous';
		audio.preload = 'auto';
		audio.loop = loop;

		const source = context.createMediaElementSource(audio);
		const gain = context.createGain();
		let endedCallback: (() => void) | null = null;

		audio.onended = () => {
			if (!audio.loop && endedCallback !== null) {
				endedCallback();
			}
		};

		const fadeTime = 0.1;
		gain.gain.value = 0;
		source.connect(gain);
		gain.connect(context.destination);

		function fadeTo(target: number, duration = fadeTime) {
			const now = context.currentTime;
			gain.gain.cancelScheduledValues(now);
			gain.gain.setValueAtTime(gain.gain.value, now);
			gain.gain.linearRampToValueAtTime(target, now + duration);
		}

		return {
			async start() {
				if (context.state === 'suspended') {
					await context.resume();
				}
				await audio.play();
				fadeTo(volume);
			},
			stop() {
				fadeTo(0);
				window.setTimeout(
					() => {
						audio.pause();
						audio.currentTime = 0;
					},
					fadeTime * 1000 + 20
				);
			},
			setVolume(nextVolume: number) {
				fadeTo(nextVolume);
			},
			setEndedCallback(callback: () => void) {
				endedCallback = callback;
			}
		};
	}
}
