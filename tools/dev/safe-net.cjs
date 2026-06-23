// Dev-only preload: some sandboxed/virtualized environments make
// os.networkInterfaces() throw `uv_interface_addresses` errors, which crashes
// Next's dev/start server while it tries to print the "Network:" URL banner.
// We wrap it so it degrades to a loopback-only result instead of throwing.
//
// Usage: NODE_OPTIONS="--require ./tools/dev/safe-net.cjs" next dev
const os = require("os");

const original = os.networkInterfaces;
os.networkInterfaces = function safeNetworkInterfaces() {
  try {
    return original.call(os);
  } catch {
    return {
      lo0: [
        {
          address: "127.0.0.1",
          netmask: "255.0.0.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: true,
          cidr: "127.0.0.1/8",
        },
      ],
    };
  }
};
