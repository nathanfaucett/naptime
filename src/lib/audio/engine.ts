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
			start() {
				if (context.state === 'suspended') {
					void context.resume();
				}
				source.start();
				fadeTo(volume);
			},
			stop() {
				fadeTo(0);
				window.setTimeout(
					() => {
						try {
							source.stop();
						} catch {
							// ignore if already stopped
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
			start() {
				if (context.state === 'suspended') {
					void context.resume();
				}
				void audio.play();
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
			}
		};
	}
}
