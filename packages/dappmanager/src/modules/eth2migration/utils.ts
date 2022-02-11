import params from "../../params";
import semver from "semver";
import { extendError } from "../../utils/extendError";
import shell from "../../utils/shell";
import { Eth2Client, Eth2Network } from "../../types";
import { DockerImageInfo } from "../docker/api/listImages";

/**
 * Fetch _SOME_ image from the available prysm package
 * MUST be fetched dynamically here because we don't know when user will do the migration
 * They may have an old version of Prysm or a newer version of Prysm.
 * @param prysmOldDnpName
 * ```
 * validator.prysm.dnp.dappnode.eth:0.1.16
 * ```
 */
export function getPrysmOldValidatorImage({
  dockerImages,
  prysmOldDnpName,
  prysmOldStableVersion
}: {
  dockerImages: DockerImageInfo[];
  prysmOldDnpName: string;
  prysmOldStableVersion: string;
}): string {
  // Get docker imageName and imageVersion that match the prysmOldDnpName and is equal to prysmOldStableVersion
  const prysmImages = dockerImages.filter(
    image =>
      image.RepoTags &&
      image.RepoTags.includes(
        `validator.${prysmOldDnpName}:${prysmOldStableVersion}`
      )
  );

  if (!prysmImages.length) throw new Error(`Could not find prysm images`);

  // merge arrays: string[][] -> string[]
  const prysmImagesRepoTags = ([] as string[]).concat(
    ...prysmImages.map(image => image.RepoTags as string[])
  );

  const prysmImage = prysmImagesRepoTags.find(tag => {
    const [imageName, imageVersion] = tag.split(":");
    return (
      imageName === `validator.${prysmOldDnpName}` &&
      semver.valid(imageVersion) &&
      semver.valid(prysmOldStableVersion) &&
      semver.eq(imageVersion, prysmOldStableVersion)
    );
  });

  if (!prysmImage)
    throw new Error(
      `Could not find a stable validator image for ${prysmOldDnpName} compatible with the CLI used in the eth2migrate`
    );

  return prysmImage;
}

/**
 * Moves prysm legacy volume wallet dir from source to target
 */
export async function moveWalletDirOldPrysmVolume({
  prysmOldValidatorVolumeName,
  alpineImage,
  source,
  target
}: {
  prysmOldValidatorVolumeName: string;
  alpineImage: string;
  source: string;
  target: string;
}): Promise<void> {
  await shell([
    "docker run",
    "--rm",
    `--name ${params.CONTAINER_TOOL_NAME_PREFIX}prysm-migration`,
    `--volume ${prysmOldValidatorVolumeName}:/root`,
    alpineImage,
    `mv ${source} ${target}`
  ]).catch(e => {
    throw extendError(e, "Error moving Prysm's legacy wallet directory");
  });
}

/**
 * Get dnpname, container and network of eth2 client validator
 * @param client
 * @param testnet
 * @returns {dnpName, containerName, network}
 *  Example:
 * [ I ]
 *    - network: "mainnet"
 *    - dnpName: "prysm.dnp.dappnode.eth"
 *    - containerName: "DAppNodePackage-validator.prysm.dnp.dappnode.eth"
 * [ II ]
 *    - network: "prater"
 *    - dnpName: "prater.dnp.dappnode.eth"
 *    - containerName: "DAppNodePackage-validator.prysm.dnp.dappnode.eth"
 */
export function getMigrationParams(
  client: Eth2Client,
  network: Eth2Network
): {
  newEth2ClientDnpName: string;
  newEth2ClientVersion: string;
  prysmOldDnpName: string;
  prysmOldValidatorContainerName: string;
  prysmOldValidatorVolumeName: string;
  prysmOldStableVersion: string;
  signerDnpName: string;
  signerContainerName: string;
} {
  const prysmOld = getPrysmOldData(network);
  const newEth2Client = getNewEth2Client(client, network);
  const eth2Web3Signer = getEth2Web3Signer(network);

  return {
    prysmOldDnpName: prysmOld.dnpName,
    prysmOldValidatorContainerName: prysmOld.validatorContainerName,
    prysmOldValidatorVolumeName: prysmOld.prysmValidatorVolumeName,
    prysmOldStableVersion: prysmOld.legacyVersion,
    newEth2ClientDnpName: newEth2Client.dnpName,
    newEth2ClientVersion: newEth2Client.version,
    signerDnpName: eth2Web3Signer.dnpName,
    signerContainerName: eth2Web3Signer.signerContainerName
  };
}

function getPrysmOldData(network: Eth2Network): {
  dnpName: string;
  validatorContainerName: string;
  prysmValidatorVolumeName: string;
  legacyVersion: string;
} {
  // TODO: determine stable versions that support the prysm cli used in the eth2migration
  switch (network) {
    case "mainnet":
      return {
        dnpName: "prysm.dnp.dappnode.eth",
        validatorContainerName: `${params.CONTAINER_NAME_PREFIX}validator.prysm.dnp.dappnode.eth`,
        prysmValidatorVolumeName: "prysm-dnpdappnodeeth_validator-data",
        legacyVersion: "1.0.22" // Version that supports the validator cli for the migration
      };
    case "prater":
      return {
        dnpName: "prysm-prater.dnp.dappnode.eth",
        validatorContainerName: `${params.CONTAINER_NAME_PREFIX}validator.prysm-prater.dnp.dappnode.eth`,
        prysmValidatorVolumeName: "prysm-praterdnpdappnodeeth_validator-data",
        legacyVersion: "0.1.7" // Version that supports the validator cli for the migration
      };
    default:
      throw Error(`Network ${network} not supported`);
  }
}

function getNewEth2Client(
  client: Eth2Client,
  network: Eth2Network
): {
  dnpName: string;
  validatorContainerName: string;
  version: string;
} {
  switch (client) {
    case "prysm":
      switch (network) {
        case "mainnet":
          return {
            dnpName: "prysm.dnp.dappnode.eth",
            validatorContainerName: `${params.CONTAINER_NAME_PREFIX}validator.prysm.dnp.dappnode.eth`,
            version: "2.0.0"
          };
        case "prater":
          return {
            dnpName: "prysm-prater.dnp.dappnode.eth",
            validatorContainerName: `${params.CONTAINER_NAME_PREFIX}validator.prysm-prater.dnp.dappnode.eth`,
            version: "2.0.0"
          };
      }

    case "lighthouse":
      switch (network) {
        case "mainnet":
          return {
            dnpName: "lighthouse.dnp.dappnode.eth",
            validatorContainerName: `${params.CONTAINER_NAME_PREFIX}validator.lighthouse.dnp.dappnode.eth`,
            version: "0.1.0"
          };
        case "prater":
          return {
            dnpName: "lighthouse-prater.dnp.dappnode.eth",
            validatorContainerName: `${params.CONTAINER_NAME_PREFIX}validator.lighthouse-prater.dnp.dappnode.eth`,
            version: "0.1.0"
          };
      }
    case "teku":
      switch (network) {
        case "mainnet":
          return {
            dnpName: "teku.dnp.dappnode.eth",
            validatorContainerName: `${params.CONTAINER_NAME_PREFIX}teku.dnp.dappnode.eth`,
            version: "0.1.0"
          };
        case "prater":
          return {
            dnpName: "teku-prater.dnp.dappnode.eth",
            validatorContainerName: `${params.CONTAINER_NAME_PREFIX}teku-prater.dnp.dappnode.eth`,
            version: "0.1.0"
          };
      }
    default:
      throw Error(`Client ${client} not supported`);
  }
}

function getEth2Web3Signer(network: Eth2Network): {
  dnpName: string;
  signerContainerName: string;
} {
  switch (network) {
    case "mainnet":
      return {
        dnpName: "web3signer.dnp.dappnode.eth",
        signerContainerName: `${params.CONTAINER_NAME_PREFIX}web3signer.web3signer.dnp.dappnode.eth`
      };
    case "prater":
      return {
        dnpName: "web3signer-prater.dnp.dappnode.eth",
        signerContainerName: `${params.CONTAINER_NAME_PREFIX}web3signer.web3signer-prater.dnp.dappnode.eth`
      };
    default:
      throw Error(`Network ${network} not supported`);
  }
}
