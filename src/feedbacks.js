const { combineRgb } = require('@companion-module/base')
const { clipChoices } = require('./actions')

const RED = combineRgb(200, 30, 30)
const AMBER = combineRgb(180, 120, 0)
const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)

/** True when the given clip id is live on any layer. */
function isClipLive(state, id) {
	if (!state || !state.layers) return false
	return Object.values(state.layers).some((l) => l && l.mediaId === id)
}

function getFeedbacks(self) {
	return {
		clip_live: {
			type: 'boolean',
			name: 'Clip is live',
			description: 'Button lights when this clip is on air (from Companion or the app).',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [
				{
					type: 'dropdown',
					id: 'clip',
					label: 'Clip',
					default: '',
					choices: clipChoices(self.state),
					allowCustom: true,
				},
			],
			callback: (feedback) => isClipLive(self.state, feedback.options.clip),
		},

		black_active: {
			type: 'boolean',
			name: 'Black is active',
			defaultStyle: { bgcolor: BLACK, color: WHITE },
			options: [],
			callback: () => !!(self.state && self.state.black),
		},

		program_live: {
			type: 'boolean',
			name: 'Program is live',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [],
			callback: () => !!(self.state && self.state.live),
		},

		playing: {
			type: 'boolean',
			name: 'Primary transport is playing',
			defaultStyle: { bgcolor: combineRgb(0, 140, 0), color: WHITE },
			options: [],
			callback: () => !!(self.state && self.state.transport && self.state.transport.playing),
		},

		muted: {
			type: 'boolean',
			name: 'Audio is muted',
			defaultStyle: { bgcolor: AMBER, color: WHITE },
			options: [],
			callback: () => !!(self.state && self.state.muted),
		},
	}
}

/**
 * One primitive per feedback id, summarising exactly what that feedback reads.
 * Compare against the previous snapshot's keys to know which ids are stale, so
 * only those get re-evaluated. Keep in step with the callbacks above.
 */
function feedbackKeys(state) {
	const s = state || {}
	const layers = s.layers || {}
	return {
		// Sorted: dictionary key order on the wire is not guaranteed stable.
		clip_live: Object.keys(layers)
			.sort()
			.map((k) => (layers[k] && layers[k].mediaId) || '')
			.join('|'),
		black_active: !!s.black,
		program_live: !!s.live,
		playing: !!(s.transport && s.transport.playing),
		muted: !!s.muted,
	}
}

module.exports = { getFeedbacks, feedbackKeys }
