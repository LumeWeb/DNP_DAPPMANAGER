import fs from "fs";
import path from "path";
import { shellHost } from "../../utils/shell";
import params from "../../params";

const hostScriptsDirFromHost = params.HOST_SCRIPTS_DIR_FROM_HOST;
const hostScriptsDir = params.HOST_SCRIPTS_DIR;

/**
 * Script runners. Helps ensure no typos
 */
type ScriptName =
  | "lvm.sh"
  | "detect_fs.sh"
  | "migrate_volume.sh"
  | "docker_engine_update.sh"
  | "docker_compose_update.sh"
  | "collect_host_info.sh"
  | "host_update.sh"
  | "avahi_daemon.sh";

/**
 * Run a script for the hostScripts folder
 * @param scriptName "detect_fs.sh"
 */
export async function runScript(
  scriptName: ScriptName,
  args = ""
): Promise<string> {
  const scriptPath = path.resolve(hostScriptsDir, scriptName);
  if (!fs.existsSync(scriptPath))
    throw Error(`Host script ${scriptName} not found`);

  const scriptPathFromHost = path.resolve(hostScriptsDirFromHost, scriptName);
  return await shellHost(`/bin/bash ${scriptPathFromHost} ${args}`);
}
