import type { NoiseType } from '../models';
import {
	setMediaSessionMetadata,
	setMediaSessionPlaybackState,
	registerMediaSessionHandlers
} from './mediaSession';
import type { Scheduler, ScheduledEvent } from './scheduler';

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

	// load external AudioWorklet module from static assets
	const workletUrl = '/audio/noise-processor.js';
	workletModuleLoaded = context.audioWorklet.addModule(workletUrl).catch((err) => {
		// reset cached promise on failure so caller can retry/fallback
		workletModuleLoaded = null;
		throw err;
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
	private scheduler: Scheduler | null = null;
	private scheduledEventHandler: ((ev: ScheduledEvent) => void) | null = null;

	constructor(options?: { scheduler?: Scheduler }) {
		if (options?.scheduler) {
			this.setScheduler(options.scheduler);
		}
	}

	setScheduler(s: Scheduler) {
		this.scheduler = s;
		this.scheduler.onEvent((ev) => {
			if (this.scheduledEventHandler) this.scheduledEventHandler(ev as ScheduledEvent);
		});
	}

	onScheduledEvent(cb: (ev: ScheduledEvent) => void) {
		this.scheduledEventHandler = cb;
	}

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

				// update Media Session for noise playback
				try {
					setMediaSessionMetadata({ title: `Noise ${type}` });
					setMediaSessionPlaybackState('playing');
					registerMediaSessionHandlers({
						play: async () => {
							if (context.state === 'suspended') await context.resume();
							fadeTo(volume);
						},
						pause: () => {
							fadeTo(0);
						}
					});
				} catch (_e) {
					void _e;
				}
			},
			stop() {
				fadeTo(0);
				window.setTimeout(
					() => {
						if (source) {
							source.disconnect();
						}
						try {
							setMediaSessionPlaybackState('paused');
						} catch (_e) {
							void _e;
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

				// update Media Session metadata and playback state so lock-screen controls work
				try {
					const title = (() => {
						try {
							return new URL(url, location.href).pathname.split('/').pop() || url;
						} catch (_e) {
							void _e;
							return url;
						}
					})();
					setMediaSessionMetadata({ title });
					setMediaSessionPlaybackState('playing');
					registerMediaSessionHandlers({
						play: async () => {
							try {
								await audio.play();
								setMediaSessionPlaybackState('playing');
							} catch (_e) {
								void _e;
							}
						},
						pause: () => {
							audio.pause();
							setMediaSessionPlaybackState('paused');
						},
						seekbackward: (details?: MediaSessionActionDetails) => {
							audio.currentTime = Math.max(0, audio.currentTime - (details?.seekOffset || 10));
						},
						seekforward: (details?: MediaSessionActionDetails) => {
							audio.currentTime = Math.min(
								audio.duration || Infinity,
								audio.currentTime + (details?.seekOffset || 10)
							);
						}
					});
				} catch (_e) {
					void _e;
					// ignore media session errors
				}
			},
			stop() {
				fadeTo(0);
				window.setTimeout(
					() => {
						audio.pause();
						audio.currentTime = 0;
						try {
							setMediaSessionPlaybackState('paused');
						} catch (_e) {
							void _e;
						}
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
