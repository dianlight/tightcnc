// @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'macroMeta'.
macroMeta({ params: {
	spindle: {
		type: 'boolean',
		default: true,
		required: true,
		description: 'Whether to turn spindle on'
	},
	speed: {
		type: 'number',
		description: 'Spindle speed'
	},
	dwell: {
		type: 'number',
		default: 5,
		required: true,
		description: 'Dwell time after spindle start'
	},
	floodCoolant: {
		type: 'boolean',
		default: false,
		description: 'Flood coolant'
	},
	mistCoolant: {
		type: 'boolean',
		default: false,
		description: 'Mist coolant'
	}
} });

// @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'spindle'.
if (spindle) push(`M3${speed ? (' S' + speed) : ''}`);
// @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'floodCoolant'.
if (floodCoolant) push('M8');
// @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'mistCoolant'.
if (mistCoolant) push('M7');
// @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'dwell'.
if (dwell) push(`G4 P${dwell}`);

