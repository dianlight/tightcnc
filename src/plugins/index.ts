const pluginList = [ './autolevel', './move-splitter', './job-recovery', './tool-change', './runtime-override' ];

const plugins = pluginList.map(async (reqName) => await import(reqName));

module.exports.registerServerComponents = (tightcnc: any) => {
	for (let plugin of plugins) {
		plugin.then( p => p.registerServerComponents(tightcnc))
	}
};

// @ts-expect-error ts-migrate(2580) FIXME: Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.registerConsoleUIComponents = (consoleui) => {
	for (let plugin of plugins) {
		plugin.then( p => p.registerConsoleUIComponents(consoleui))
	}
};

