{
	"targets": [{
		"target_name": "adapter",
		"cflags!": ["-fno-exceptions"],
		"cflags_cc!": ["-fno-exceptions"],
		"defines": ["NAPI_CPP_EXCEPTIONS"],
		"include_dirs": [
			"<!@(node -p \"require('node-addon-api').include\")",
			"include",
			"include/kcbpcli/lib",
			"include/json",
			"include/self"
		],
		"sources": [
			"src/adapter.cpp",
			"include/self/tools.hpp",
			"include/self/KCBPClient.hpp"
		],
		"conditions": [
			["OS=='win'", {
				"libraries": [
					"<(module_root_dir)/include/kcbpcli/lib/KCBPCli.lib"
				]
			}]
		]
	}]
}
