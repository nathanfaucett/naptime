import type { NoiseType } from '../models';

export interface NoiseGenerator {
	start(): void;
	stop(): void;
	setVolume(volume: number): void;
}

function createNoiseBuffer(context: AudioContext, type: NoiseType): AudioBuffer {
	const length = context.sampleRate * 2;
	const buffer = context.createBuffer(1, length, context.sampleRate);
	const channel = buffer.getChannelData(0);
	let last = 0;

	for (let i = 0; i < length; i += 1) {
		const white = Math.random() * 2 - 1;

		if (type === 'white') {
			channel[i] = white;
		} else if (type === 'pink') {
			last = 0.98 * last + 0.02 * white;
			channel[i] = last * 0.5;
		} else {
			last = last + white * 0.02;
			channel[i] = Math.max(-1, Math.min(1, last));
		}
	}

	return buffer;
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
		const source = context.createBufferSource();
		source.buffer = createNoiseBuffer(context, type);
		source.loop = true;

		gain.gain.value = volume;
		source.connect(gain);
		gain.connect(context.destination);

		return {
			start() {
				if (context.state === 'suspended') {
					void context.resume();
				}
				source.start();
			},
			stop() {
				source.stop();
			},
			setVolume(nextVolume: number) {
				gain.gain.setTargetAtTime(nextVolume, context.currentTime, 0.01);
			}
		};
	}

	createMediaPlayer(url: string, volume = 0.5): NoiseGenerator {
		const context = this.audioContext;
		const audio = new Audio(url);
		audio.crossOrigin = 'anonymous';
		audio.preload = 'auto';

		const source = context.createMediaElementSource(audio);
		const gain = context.createGain();

		gain.gain.value = volume;
		source.connect(gain);
		gain.connect(context.destination);

		return {
			start() {
				if (context.state === 'suspended') {
					void context.resume();
				}
				void audio.play();
			},
			stop() {
				audio.pause();
				audio.currentTime = 0;
			},
			setVolume(nextVolume: number) {
				gain.gain.setTargetAtTime(nextVolume, context.currentTime, 0.01);
			}
		};
	}
}
