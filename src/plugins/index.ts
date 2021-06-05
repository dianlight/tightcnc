import { ConsoleUI } from "../consoleui/consoleui";
import TightCNCServer from "../server/tightcnc-server";

const pluginList = [ 'autolevel', 'move-splitter', 'job-recovery', 'tool-change', 'runtime-override' ];

const plugins = pluginList.map(async (reqName) => await import(`./${reqName}`));

export function registerServerComponents(tightcnc: TightCNCServer) {
	for (let plugin of plugins) {
		plugin.then( p => p.registerServerComponents(tightcnc))
	}
};

export function registerConsoleUIComponents(consoleui:ConsoleUI) {
	for (let plugin of plugins) {
		plugin.then( p => p.registerConsoleUIComponents(consoleui))
	}
};

