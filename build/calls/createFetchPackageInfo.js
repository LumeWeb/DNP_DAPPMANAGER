const { parsePackageReq } = require('../utils/parse')
const getManifest = require('../modules/getManifest')
const apm = require('../modules/calls/apm')


function createFetchPackageInfo() {

  return async function fetchPackageInfo(req) {

    let packageName = parsePackageReq(req[0]).name
    let packageWithVersions = await getPackageVersions(packageName)

    await getManifestOfVersions(packageName, packageWithVersions.versions)

    return JSON.stringify({
        success: true,
        message: "Fetched " + packageName + " info",
        result: packageWithVersions
    })

  }
}




///////////////////////////////
// Helper functions


async function getManifestOfVersions(packageName, versions) {

  let manifests = await Promise.all(
    versions.map( async (version) => {
      try {
        version.manifest = await getManifest(packageName + '@' + version.version)
      } catch(e) {
        console.error(Error(e))
        version.manifest = 'Error: '+e.message
      }
    })
  )
}


async function getPackageVersions(packageName) {
  return {
    name: packageName,
    versions: ( await apm.getRepoVersions(packageName) ).reverse()
  }
}


module.exports = createFetchPackageInfo
