export type ScheduledEvent = { id?: string; delayMs: number; action: string; payload?: any };

export class Scheduler {
	private worker: Worker;

	constructor(workerUrl = '/audio/scheduler-worker.js') {
		this.worker = new Worker(workerUrl);
	}

	onEvent(cb: (event: ScheduledEvent & { id: string }) => void) {
		this.worker.onmessage = (e: MessageEvent) => {
			const data = (e as any).data;
			if (data?.type === 'event') {
				cb(data.event as ScheduledEvent & { id: string });
			}
		};
	}

	// schedules events and returns the assigned ids for later cancellation
	schedule(events: ScheduledEvent[]): Promise<string[]> {
		const normalized = events.map((ev) => ({
			...ev,
			id: ev.id || `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
		}));
		this.worker.postMessage({ type: 'schedule', events: normalized });
		return Promise.resolve(normalized.map((e) => e.id as string));
	}

	cancel(ids: string[]) {
		this.worker.postMessage({ type: 'cancel', ids });
	}

	clearAll() {
		this.worker.postMessage({ type: 'clearAll' });
	}

	ping(): Promise<any> {
		return new Promise((resolve) => {
			const handler = (e: MessageEvent) => {
				const data = (e as any).data;
				if (data?.type === 'pong') {
					this.worker.removeEventListener('message', handler as EventListener);
					resolve(data);
				}
			};
			this.worker.addEventListener('message', handler as EventListener);
			this.worker.postMessage({ type: 'ping' });
		});
	}

	destroy() {
		this.worker.terminate();
	}
}
