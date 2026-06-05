// Sandbox shim: os.networkInterfaces() throws (uv_interface_addresses) in some
// restricted environments. Next only uses it to log the LAN URL, so fall back
// to an empty map instead of crashing dev startup.
const os = require("os");
const original = os.networkInterfaces;
os.networkInterfaces = function patchedNetworkInterfaces() {
  try {
    return original.call(os);
  } catch {
    return {};
  }
};
