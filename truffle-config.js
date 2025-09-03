const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
	networks: {
		development: {
			host: "127.0.0.1",
			port: 7545,
			network_id: "*",
		},

		buildbear: {
			provider: () =>
				new HDWalletProvider(
					"4adf0ba9931c26966ec004888761d01ea6efc38ea1f05c77d67b288af9801bd3", // your private key
					"https://rpc.buildbear.io/annoyed-odin-6890c975" // BuildBear RPC
				),
			network_id: 31337, // BuildBear’s default (sometimes *)
			chain_id: 31337,
			gas: 6000000,
			gasPrice: 1000000000, // 1 gwei
		},
	},

	compilers: {
		solc: {
			version: "0.8.0",
		},
	},
};
