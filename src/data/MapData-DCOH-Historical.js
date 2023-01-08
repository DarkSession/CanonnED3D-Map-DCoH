const timeAgo = (date, units = 2) => {
	let seconds = Math.floor((+new Date() - +new Date(date)) / 1000);
	const future = (seconds < 0);
	seconds = Math.abs(seconds);
	if (seconds < 29) {
		return 'Just now';
	}
	const intervals = {
		'year': 31536000,
		'month': 2592000,
		'week': 604800,
		'day': 86400,
		'hour': 3600,
		'minute': 60,
		'second': 1,
	};
	let unitResults = [];
	for (const i in intervals) {
		const counter = Math.floor(seconds / intervals[i]);
		if (counter > 0) {
			seconds -= (counter * intervals[i]);
			if (counter === 1) {
				unitResults.push(counter + ' ' + i);
			} else {
				unitResults.push(counter + ' ' + i + 's');
			}
		}
	}
	if (unitResults.length === 0) {
		return "";
	}
	const unitResult = unitResults.slice(0, units).join(", ");
	if (future) {
		return unitResult;
	}
	return unitResult + " ago";
}

const canonnEd3d_route = {
	init: async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const date = urlParams.get("date") || "2000-01-01";

		const response = await fetch(`https://dcoh.watch/api/v1/overwatch/systems/${date}?ngsw-bypass=true`);
		if (response.status === 200) {
			const result = await response.json();

			const systemsData = {
				categories: {
					'Systems': {
						'00': {
							name: 'Sol',
							color: "78b7f6",
						},
					},
					'States': {
						'Clear': {
							name: 'Clear',
							color: "333333"
						},
						'ClearNew': {
							name: 'Clear (New)',
							color: "ffffff"
						},
						'AlertNew': {
							name: 'Alert (New)',
							color: "f1c232"
						},
						'Invasion': {
							name: 'Invasion',
							color: "993000"
						},
						'InvasionNew': {
							name: 'Invasion (New)',
							color: "ff7433"
						},
						'Controlled': {
							name: 'Controlled',
							color: "13290a"
						},
						'ControlledNew': {
							name: 'Controlled (New)',
							color: "80d75b"
						},
						'Maelstrom': {
							name: 'Maelstrom',
							color: "4d0000"
						},
						'Recovery': {
							name: 'Recovery',
							color: "590099"
						},
						'RecoveryNew': {
							name: 'Recovery (New)',
							color: "aa33ff"
						},
					},
				},
				systems: [],
				routes: [],
			};

			const solSite = {
				cat: ['00'],
				name: "Sol",
				infos: "Cradle of Mankind<br>",
				coords: {
					x: 0,
					y: 0,
					z: 0,
				}
			};
			systemsData.systems.push(solSite);

			for (const data of result.systems) {
				let infos =
					`<b>State</b>: ${data.thargoidLevel.name}<br>` +
					`<b>Previous state</b>: ${data.previousThargoidLevel.name}<br>` +
					`<b>Maelstrom</b>: ${data.maelstrom.name}<br>`;
				const poiSite = {
					name: data.name,
					infos: infos,
					cat: [data.state],
					coords: data.coordinates,
				}
				systemsData.systems.push(poiSite);
			}

			const camerapos = { x: 0, y: 0, z: 0 };

			document.getElementById("loading").style.display = "none";
			Ed3d.init({
				container: 'edmap',
				json: systemsData,
				withFullscreenToggle: false,
				withHudPanel: true,
				hudMultipleSelect: true,
				effectScaleSystem: [20, 500],
				startAnim: true,
				showGalaxyInfos: true,
				cameraPos: [camerapos.x - 400, camerapos.y, camerapos.z - 400],
				playerPos: [camerapos.x, camerapos.y, camerapos.z],
				systemColor: '#FF9D00',
			});
		}
	},
};
