import os from "os"

export function serverInfo() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpus: os.cpus().map((cpu) => ({
      model: cpu.model,
      speed: cpu.speed,
    })),
    networkInterfaces: os.networkInterfaces(),
    loadAvg: os.loadavg(),
  }
}
