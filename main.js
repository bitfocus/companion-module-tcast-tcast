const { InstanceBase, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const { getConfigFields } = require('./src/config')
const { TcastClient } = require('./src/client')
const { getActions } = require('./src/actions')
const { getFeedbacks, feedbackKeys } = require('./src/feedbacks')
const { getVariableDefinitions, variableValues } = require('./src/variables')
const { getPresets } = require('./src/presets')

class TcastInstance extends InstanceBase {
	async init(config) {
		this.config = config
		/** Latest feedback snapshot pushed by TCast (null until connected). */
		this.state = null
		/** Last values pushed to Companion, so unchanged ones aren't pushed again. */
		this.lastVars = {}
		this.lastFeedbackKeys = {}

		this.setVariableDefinitions(getVariableDefinitions())
		// Actions first: Companion validates presets against the known action ids
		// as they are registered, and warns for every id that is not defined yet.
		this.rebuildDefinitions()
		this.setPresetDefinitions(getPresets())

		this.client = new TcastClient(this)
		this.client.start()
	}

	async destroy() {
		if (this.client) this.client.stop()
	}

	async configUpdated(config) {
		this.config = config
		// A different TCast means the caches describe nothing; push everything again.
		this.lastVars = {}
		this.lastFeedbackKeys = {}
		if (this.client) {
			this.client.stop()
			this.client.start()
		}
	}

	getConfigFields() {
		return getConfigFields()
	}

	/**
	 * Re-register actions and feedbacks so their clip dropdowns reflect the
	 * current board. Called on every snapshot because clips can be added,
	 * renamed, or reordered in the app at any time.
	 */
	rebuildDefinitions() {
		this.setActionDefinitions(getActions(this))
		this.setFeedbackDefinitions(getFeedbacks(this))
	}

	/** Handle a decoded WebSocket message from the control server. */
	onMessage(msg) {
		if (!msg || typeof msg !== 'object') return
		if (msg.type === 'state') {
			const prevSignature = this.clipSignature(this.state)
			this.state = msg
			// Only rebuild dropdowns when the clip set actually changed.
			// Avoids churn on every play/pause tally update.
			if (this.clipSignature(msg) !== prevSignature) this.rebuildDefinitions()
			this.updateStatus(InstanceStatus.Ok)
			this.publish()
		} else if (msg.type === 'transport') {
			if (!this.state) return
			// Merge the tick into the cached snapshot for the time variables.
			this.state.transport = { ...this.state.transport, ...msg }
			this.publish()
		}
	}

	/**
	 * Push the variables and feedbacks whose values actually changed, and nothing
	 * else. Transport ticks arrive about once a second and move two variables at
	 * most, so a blanket push would be almost entirely redundant traffic.
	 */
	publish() {
		const values = variableValues(this.state)
		const changed = {}
		for (const key of Object.keys(values)) {
			if (this.lastVars[key] !== values[key]) changed[key] = values[key]
		}
		if (Object.keys(changed).length) {
			this.setVariableValues(changed)
			Object.assign(this.lastVars, changed)
		}

		const keys = feedbackKeys(this.state)
		const stale = Object.keys(keys).filter((id) => this.lastFeedbackKeys[id] !== keys[id])
		if (stale.length) {
			this.checkFeedbacks(...stale)
			this.lastFeedbackKeys = keys
		}
	}

	/** A cheap signature of the clip list (id + name) to detect real changes. */
	clipSignature(state) {
		if (!state || !Array.isArray(state.clips)) return ''
		return state.clips.map((c) => `${c.id}:${c.name}`).join('|')
	}
}

runEntrypoint(TcastInstance, [])
