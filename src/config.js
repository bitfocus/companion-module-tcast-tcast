const { Regex } = require('@companion-module/base')

/** Connection config fields shown in Companion's module settings. */
function getConfigFields() {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'TCast Remote Control',
			value:
				'Enter the address of the Mac running TCast. Find it in TCast under Settings → Remote Control. Use the LAN address (not localhost) when Companion runs on another machine.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Host / IP',
			width: 8,
			default: '127.0.0.1',
			regex: Regex.HOSTNAME,
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'Port',
			width: 4,
			default: '7341',
			regex: Regex.PORT,
		},
		{
			// secret-text, not textinput: the value is kept in Companion's
			// secrets store rather than in the connection config, so it is not
			// reported to the web UI and does not travel inside an exported
			// config unless the operator asks for secrets to be included.
			type: 'secret-text',
			id: 'password',
			label: 'Control password (optional)',
			width: 12,
			default: '',
			tooltip: "Only if you set a control password in TCast's Remote Control settings. Leave blank otherwise.",
		},
	]
}

module.exports = { getConfigFields }
