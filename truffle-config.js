module.exports = {
	networks: {
		development: {
			host: "127.0.0.1",
			port: 7545,
			network_id: "*",
		},
	},
	compilers: {
		solc: {
			version: "0.8.0",
		},
	},
	networks: {
		buildbear: {
			url: "https://rpc.buildbear.io/fixed-ironman-c2639ee1",
			accounts: [
				"f0354b4cee7ac63523b9b02af9860f1a5dbc79f6e122b5fd29b600c16fbef7b5",
			],
			chainId: 31337,
			network_id: 31337,
		},
	},
};
