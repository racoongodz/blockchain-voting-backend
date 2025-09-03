module.exports = {
	networks: {
		development: {
			host: "127.0.0.1",
			port: 7545,
			network_id: "5777",
		},
	},
	compilers: {
		solc: {
			version: "0.8.0",
		},
	},
	networks: {
		buildbear: {
			url: "https://rpc.buildbear.io/annoyed-odin-6890c975",
			accounts: [
				"4adf0ba9931c26966ec004888761d01ea6efc38ea1f05c77d67b288af9801bd3",
			],
			chainId: 31337,
			network_id: 31337,
		},
	},
};
