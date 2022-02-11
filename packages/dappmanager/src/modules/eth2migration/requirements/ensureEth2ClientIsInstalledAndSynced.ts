import { packageInstall } from "../../../calls";
import { logs } from "../../../logs";
import { listPackageNoThrow } from "../../docker/list";
import semver from "semver";
import { Eth2Client } from "../../../types";

/**
 * Ensures:
 * - eth2client installed
 * - eth2client synced
 * @param param0
 */
export async function ensureEth2ClientIsInstalledAndSynced({
  dnpName,
  client,
  newEth2ClientVersion
}: {
  dnpName: string;
  client: Eth2Client;
  newEth2ClientVersion: string;
}): Promise<void> {
  const dnp = await listPackageNoThrow({ dnpName });

  // If Prysm ensure it's the "new" version that works with web3 signer else install eth2client
  if (client === "prysm") {
    if (dnp && semver.gte(dnp.version, newEth2ClientVersion))
      logs.debug("Prysm satifies web3signer version");
    else {
      logs.debug(
        `Updating Prysm legacy to Prysm-web3signer (${newEth2ClientVersion})`
      );
      await packageInstall({ name: dnpName, version: newEth2ClientVersion });
    }
  } else {
    if (!dnp) {
      logs.debug(
        `Eth2 migration: eth2 client ${client} not installed ${dnpName}, installing it`
      );
      await packageInstall({ name: dnpName, version: newEth2ClientVersion });
    }
  }

  // TODO: Check it is synced
  // - prysm?
  // - teku
  // - lighthouse
}
