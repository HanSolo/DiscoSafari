const baseUrl = 'https://api.foojay.io';
const scope   = 'discovery_scope_id=public&discovery_scope_id=build_of_openjdk';

var   majorVersions               = [];
var   selectedPkgs                = [];
var   selectedPkg                 = null;
var   selectedPkgsForMajorVersion = [];
var   javafxBundled;
var   selectedMajorVersion;
var   selectedVersionNumber;
var   selectedDistribution;
var   selectedOperatingSystem;
var   selectedLibcType;
var   selectedArchitecture;
var   selectedArchiveType;
var   javafxBundledCheckBox   = document.getElementById('javafxBundledCheckBox');
var   majorVersionDropDown    = document.getElementById('majorVersionDropDown');
var   versionNumberDropDown   = document.getElementById('versionNumberDropDown');
var   distributionDropDown    = document.getElementById('distributionDropDown');
var   operatingSystemDropDown = document.getElementById('operatingSystemDropDown');
var   libcTypeDropDown        = document.getElementById('libcTypeDropDown');
var   architectureDropDown    = document.getElementById('architectureDropDown');
var   archiveTypeDropDown     = document.getElementById('archiveTypeDropDown');
var   filenameLabel           = document.getElementById('filenameLabel');
var   downloadButton          = document.getElementById('downloadButton');

document.addEventListener("DOMContentLoaded", () => {
    javafxBundledCheckBox.addEventListener("change", selectJavaFxBundled);
    majorVersionDropDown.addEventListener("change", selectMajorVersion);
    versionNumberDropDown.addEventListener("change", selectVersionNumber);
    distributionDropDown.addEventListener("change", selectDistribution);
    operatingSystemDropDown.addEventListener("change", selectOperatingSystem);
    libcTypeDropDown.addEventListener("change", selectLibcType);
    architectureDropDown.addEventListener("change", selectArchitecture);
    archiveTypeDropDown.addEventListener("change", selectArchiveType);
    downloadButton.addEventListener("click", download);
    
    init();
});


// ******************** Methods **********************************************
async function init() {
  let   json     = await getMaintainedMajorVersions();
  const response = JSON.parse(json);
  const data     = response.result;

  for (let i = 0 ; i < data.length ; i++) {
    majorVersions.push(data[i]);
    let option   = document.createElement('option');
    option.id    = data[i].major_version;
    option.text  = data[i].major_version;
    option.value = data[i].major_version;
    majorVersionDropDown.add(option);
  }
  majorVersionDropDown.style.display = 'block';
  majorVersionDropDown.selectedIndex = 0;
  selectMajorVersion();
}

function selectJavaFxBundled() {
  let javafxBundledCheckBox = document.getElementById('javafxBundledCheckBox');
  javafxBundled = javafxBundledCheckBox.checked;

  let selection;
  if (selectedMajorVersion.early_access_only) {
    selection = selectedPkgsForMajorVersion.filter(function(pkg) {
      return pkg.java_version   == selectedVersionNumber &&
             pkg.javafx_bundled == javafxBundled;
    });
  } else {
    selection = selectedPkgsForMajorVersion.filter(function(pkg) {
      return normalizeJavaVersion(pkg.java_version) == selectedVersionNumber &&
             pkg.javafx_bundled                     == javafxBundled;
    });
  }
                    
  let distrosForSelection = [];
  for (let i = 0 ; i < selection.length ; i++) {
    let distro = selection[i].distribution;
    if (distro == 'sap_machine') {
        distrosForSelection.push('SAP Machine');
      } else if (distro == 'oracle_open_jdk') {
        distrosForSelection.push('Oracle OpenJDK');
      } else if (distro =='aoj') {
        distrosForSelection.push('AOJ');
      } else if (distro =='aoj_openj9') {
        distrosForSelection.push('AOJ OpenJ9');
      } else {
        distrosForSelection.push(capitalize(distro));
      }
  }
  distrosForSelection = distrosForSelection.filter(uniqueOnly);
  
  let distributionDropDown = document.getElementById('distributionDropDown');
  removeDropdownEntries(distributionDropDown);
  for (let i = 0 ; i < distrosForSelection.length ; i++) {
    option       = document.createElement('option');
    option.id    = distrosForSelection[i];
    option.text  = distrosForSelection[i];
    option.value = distrosForSelection[i];
    distributionDropDown.add(option);
  }
  distributionDropDown.style.display = 'block';
  if (distrosForSelection.length > 0) {
    distributionDropDown.selectedIndex = 0;
  } else {
    let operatingSystemDropDown = document.getElementById('operatingSystemDropDown');
    let libcTypeDropDown        = document.getElementById('libcTypeDropDown');
    let architectureDropDown    = document.getElementById('architectureDropDown');
    let archiveTypeDropDown     = document.getElementById('archiveTypeDropDown');
    let filenameLabel           = document.getElementById('filenameLabel');
    removeDropdownEntries(operatingSystemDropDown);
    removeDropdownEntries(libcTypeDropDown);
    removeDropdownEntries(architectureDropDown);
    removeDropdownEntries(archiveTypeDropDown);
    filenameLabel.innerHTML = '-';
  }
  selectVersionNumber();
}

async function selectMajorVersion() {
  let majorVersionDropDown = document.getElementById('majorVersionDropDown');
  selectedMajorVersion = majorVersions[majorVersionDropDown.selectedIndex];
  let javafxBundledCheckBox = document.getElementById('javafxBundledCheckBox');
  javafxBundledCheckBox.disabled = true;
  
  getPkgsWithFxForMajorVersion(selectedMajorVersion).then(
    function(pkgs) {
      // Success
      selectedPkgsForMajorVersion = pkgs;
      javafxBundledCheckBox.disabled = false;
      selectVersionNumber();
    },
    function() {
      // Failure
      console.log("error");
      selectedPkgsForMajorVersion = [];
      javafxBundledCheckBox.disabled = false;
    }
  );

  let versions = selectedMajorVersion.versions;
  if (!selectedMajorVersion.early_access_only) {
    versions = versions.filter(function(version) {
      return version.indexOf('-ea') == -1;
    });
    for (let i = 0 ; i < versions.length ; i++) {
      versions[i] = normalizeJavaVersion(versions[i]);
    }
  }
  versions = versions.filter(uniqueOnly);

  removeDropdownEntries(versionNumberDropDown);
  for (let i = 0 ; i < versions.length ; i++) {
    let option   = document.createElement('option');
    option.id    = versions[i];
    option.text  = versions[i];
    option.value = versions[i];
    versionNumberDropDown.add(option);
  }
  versionNumberDropDown.style.display = 'block';
  versionNumberDropDown.selectedIndex = 0;
  selectVersionNumber();
}

async function selectVersionNumber() {
  let versionNumberDropDown = document.getElementById('versionNumberDropDown');
  selectedVersionNumber = versionNumberDropDown.value;
  
  let javafxBundledCheckBox = document.getElementById('javafxBundledCheckBox');
  javafxBundled = javafxBundledCheckBox.checked;
  
  let distrosForSelection = [];
  if (javafxBundled) {
    let include_build = selectedMajorVersion.early_access_only;
    let selection;
    if (selectedMajorVersion.early_access_only) {
      selection = selectedPkgsForMajorVersion.filter(function(pkg) {
        return pkg.java_version   == selectedVersionNumber &&
               pkg.javafx_bundled == javafxBundled;
      });
    } else {
      selection = selectedPkgsForMajorVersion.filter(function(pkg) {
        return normalizeJavaVersion(pkg.java_version) == selectedVersionNumber &&
               pkg.javafx_bundled                     == javafxBundled;
      });
    }
    for (let i = 0 ; i < selection.length ; i++) {
      let distro = selection[i].distribution;
      if (distro == 'sap_machine') {
          distrosForSelection.push('SAP Machine');
        } else if (distro == 'oracle_open_jdk') {
          distrosForSelection.push('Oracle OpenJDK');
        } else if (distro =='aoj') {
          distrosForSelection.push('AOJ');
        } else if (distro =='aoj_openj9') {
          distrosForSelection.push('AOJ OpenJ9');
        } else {
          distrosForSelection.push(capitalize(distro));
        }
    }
    distrosForSelection = distrosForSelection.filter(uniqueOnly);
  } else {
    let   url      = baseUrl + '/disco/v2.0/distributions/versions/' + selectedVersionNumber + '?' + scope;
    let   json     = await getPackages(url);
    const response = JSON.parse(json);
    const data     = response.result;

    if (data.length > 0) {
      for (let i = 0 ; i < data.length ; i++) {
        let distro = data[i].name;
        if (distro == 'sap_machine') {
          distrosForSelection.push('SAP Machine');
        } else if (distro == 'oracle_open_jdk') {
          distrosForSelection.push('Oracle OpenJDK');
        } else if (distro =='aoj') {
          distrosForSelection.push('AOJ');
        } else if (distro =='aoj_openj9') {
          distrosForSelection.push('AOJ OpenJ9');
        } else {
          distrosForSelection.push(capitalize(distro));
        }
      }
      distrosForSelection = distrosForSelection.filter(uniqueOnly);
    }
  }
        
  let distributionDropDown = document.getElementById('distributionDropDown');
  removeDropdownEntries(distributionDropDown);
  for (let i = 0 ; i < distrosForSelection.length ; i++) {
    option       = document.createElement('option');
    option.id    = distrosForSelection[i];
    option.text  = distrosForSelection[i];
    option.value = distrosForSelection[i];
    distributionDropDown.add(option);
  }
  distributionDropDown.style.display = 'block';
  if (distrosForSelection.length > 0) {
    distributionDropDown.selectedIndex = 0;
    selectDistribution();
  } else {
    let operatingSystemDropDown = document.getElementById('operatingSystemDropDown');
    let libcTypeDropDown        = document.getElementById('libcTypeDropDown');
    let architectureDropDown    = document.getElementById('architectureDropDown');
    let archiveTypeDropDown     = document.getElementById('archiveTypeDropDown');
    let filenameLabel           = document.getElementById('filenameLabel');
    removeDropdownEntries(operatingSystemDropDown);
    removeDropdownEntries(libcTypeDropDown);
    removeDropdownEntries(architectureDropDown);
    removeDropdownEntries(archiveTypeDropDown);
    filenameLabel.innerHTML = '-';
  }
}

async function selectDistribution() {
  let distributionDropDown = document.getElementById('distributionDropDown');
  selectedDistribution = distributionDropDown.value;
  
  let   url      = baseUrl + '/disco/v2.0/packages' + '?version=' + selectedVersionNumber + '&distro=' + selectedDistribution + '&package_type=jdk&release_status=ga&release_status=ea&' + scope;
  let   json     = await getPackages(url);
  const response = JSON.parse(json);
  const data     = response.result;

  var operatingSystems = [];
  var architectures    = [];
  var libcTypes        = [];
  var archiveTypes     = [];
  selectedPkgs = []
  for (let i = 0 ; i < data.length ; i++) {
    selectedPkgs.push(data[i]);
    operatingSystems.push(selectedPkgs[i].operating_system);
    architectures.push(selectedPkgs[i].architecture);
    libcTypes.push(selectedPkgs[i].lib_c_type);
    archiveTypes.push(selectedPkgs[i].archive_type);
  }
  operatingSystems = operatingSystems.filter(uniqueOnly);
  architectures    = architectures.filter(uniqueOnly);
  libcTypes        = libcTypes.filter(uniqueOnly);
  archiveTypes     = archiveTypes.filter(uniqueOnly);
  
  removeDropdownEntries(operatingSystemDropDown)
  for (let i = 0 ; i < operatingSystems.length ; i++) {
    option       = document.createElement('option');
    option.id    = operatingSystems[i];
    option.text  = operatingSystems[i];
    option.value = operatingSystems[i];
    operatingSystemDropDown.add(option);
  }
  distributionDropDown.style.display = 'block';
  selectOperatingSystem();
}

function selectOperatingSystem() {
  let javafxBundledCheckBox   = document.getElementById('javafxBundledCheckBox');
  javafxBundled               = javafxBundledCheckBox.checked;

  let versionNumberDropDown   = document.getElementById('versionNumberDropDown');
  selectedVersionNumber       = versionNumberDropDown.value;
  
  let distributionDropDown    = document.getElementById('distributionDropDown');
  selectedDistribution        = getDistributionFromText(distributionDropDown.value);

  let operatingSystemDropDown = document.getElementById('operatingSystemDropDown');
  selectedOperatingSystem     = operatingSystemDropDown.value;
  
  let selection;
  if (selectedMajorVersion.early_access_only) {
    selection = selectedPkgs.filter(function(pkg) {
      return pkg.distribution     == selectedDistribution &&
             pkg.java_version     == selectedVersionNumber &&
             pkg.operating_system == selectedOperatingSystem &&
             pkg.javafx_bundled   == javafxBundled;
    });
  } else {
    selection = selectedPkgs.filter(function(pkg) {
      return pkg.distribution                       == selectedDistribution &&
             normalizeJavaVersion(pkg.java_version) == selectedVersionNumber &&
             pkg.operating_system                   == selectedOperatingSystem &&
             pkg.javafx_bundled                     == javafxBundled;
    });
  }
  
  let libcTypes = [];
  for (let i = 0 ; i < selection.length ; i++) {
    libcTypes.push(selection[i].lib_c_type);
  }
  libcTypes= libcTypes.filter(uniqueOnly);
  
  let libcTypeDropDown = document.getElementById('libcTypeDropDown');
  removeDropdownEntries(libcTypeDropDown);
  for (let i = 0 ; i < libcTypes.length ; i++) {
    option       = document.createElement('option');
    option.id    = libcTypes[i];
    option.text  = libcTypes[i];
    option.value = libcTypes[i];
    libcTypeDropDown.add(option);
  }
  libcTypeDropDown.style.display = 'block';
  libcTypeDropDown.selectedIndex = 0;
  selectLibcType();
}

function selectLibcType() {
  let javafxBundledCheckBox   = document.getElementById('javafxBundledCheckBox');
  javafxBundled               = javafxBundledCheckBox.checked;

  let versionNumberDropDown   = document.getElementById('versionNumberDropDown');
  selectedVersionNumber       = versionNumberDropDown.value;
  
  let distributionDropDown    = document.getElementById('distributionDropDown');
  selectedDistribution        = getDistributionFromText(distributionDropDown.value);

  let operatingSystemDropDown = document.getElementById('operatingSystemDropDown');
  selectedOperatingSystem     = operatingSystemDropDown.value;

  let libcTypeDropDown        = document.getElementById('libcTypeDropDown');
  selectedLibcType            = libcTypeDropDown.value;

  
  let selection;
  if (selectedMajorVersion.early_access_only) {
    selection = selectedPkgs.filter(function(pkg) {
      return pkg.distribution     == selectedDistribution &&
             pkg.java_version     == selectedVersionNumber &&
             pkg.operating_system == selectedOperatingSystem &&
             pkg.lib_c_type       == selectedLibcType &&
             pkg.javafx_bundled   == javafxBundled;
    });
  } else {
    selection = selectedPkgs.filter(function(pkg) {
      return pkg.distribution                       == selectedDistribution &&
             normalizeJavaVersion(pkg.java_version) == selectedVersionNumber &&
             pkg.operating_system                   == selectedOperatingSystem &&
             pkg.lib_c_type                         == selectedLibcType &&
             pkg.javafx_bundled                     == javafxBundled;
    });
  }
  
  let architectures = [];
  for (let i = 0 ; i < selection.length ; i++) {
    architectures.push(selection[i].architecture);
  }
  architectures= architectures.filter(uniqueOnly);
  
  let architectureDropDown = document.getElementById('architectureDropDown');
  removeDropdownEntries(architectureDropDown);
  for (let i = 0 ; i < architectures.length ; i++) {
    option       = document.createElement('option');
    option.id    = architectures[i];
    option.text  = architectures[i];
    option.value = architectures[i];
    architectureDropDown.add(option);
  }
  architectureDropDown.style.display = 'block';
  architectureDropDown.selectedIndex = 0;
  selectArchitecture();
}

function selectArchitecture() {
  let javafxBundledCheckBox   = document.getElementById('javafxBundledCheckBox');
  javafxBundled               = javafxBundledCheckBox.checked;

  let versionNumberDropDown   = document.getElementById('versionNumberDropDown');
  selectedVersionNumber       = versionNumberDropDown.value;
  
  let distributionDropDown    = document.getElementById('distributionDropDown');
  selectedDistribution        = getDistributionFromText(distributionDropDown.value);

  let operatingSystemDropDown = document.getElementById('operatingSystemDropDown');
  selectedOperatingSystem     = operatingSystemDropDown.value;

  let libcTypeDropDown        = document.getElementById('libcTypeDropDown');
  selectedLibcType            = libcTypeDropDown.value;

  let architectureDropDown    = document.getElementById('architectureDropDown');
  selectedArchitecture        = architectureDropDown.value;
  
  let selection;
  if (selectedMajorVersion.early_access_only) {
    selection = selectedPkgs.filter(function(pkg) {
      return pkg.distribution     == selectedDistribution &&
             pkg.java_version     == selectedVersionNumber &&
             pkg.operating_system == selectedOperatingSystem &&
             pkg.lib_c_type       == selectedLibcType &&
             pkg.architecture     == selectedArchitecture &&
             pkg.javafx_bundled   == javafxBundled;
    });
  } else {
    selection = selectedPkgs.filter(function(pkg) {
      return pkg.distribution                       == selectedDistribution &&
             normalizeJavaVersion(pkg.java_version) == selectedVersionNumber &&
             pkg.operating_system                   == selectedOperatingSystem &&
             pkg.lib_c_type                         == selectedLibcType &&
             pkg.architecture                       == selectedArchitecture &&
             pkg.javafx_bundled                     == javafxBundled;
    });
  }

  let archiveTypes = [];
  for (let i = 0 ; i < selection.length ; i++) {
    archiveTypes.push(selection[i].archive_type);
  }
  archiveTypes= archiveTypes.filter(uniqueOnly);
  
  let archiveTypeDropDown = document.getElementById('archiveTypeDropDown');
  removeDropdownEntries(archiveTypeDropDown);
  for (let i = 0 ; i < archiveTypes.length ; i++) {
    option       = document.createElement('option');
    option.id    = archiveTypes[i];
    option.text  = archiveTypes[i];
    option.value = archiveTypes[i];
    archiveTypeDropDown.add(option);
  }
  archiveTypeDropDown.style.display = 'block';
  archiveTypeDropDown.selectedIndex = 0;
  selectArchiveType();
}

function selectArchiveType() {
  let archiveTypeDropDown = document.getElementById('archiveTypeDropDown');
  selectedArchiveType = archiveTypeDropDown.value;
  update();
}

function update() {
  let javafxBundledCheckBox   = document.getElementById('javafxBundledCheckBox');
  javafxBundled               = javafxBundledCheckBox.checked;

  let versionNumberDropDown   = document.getElementById('versionNumberDropDown');
  selectedVersionNumber       = versionNumberDropDown.value;
  
  let distributionDropDown    = document.getElementById('distributionDropDown');
  selectedDistribution        = getDistributionFromText(distributionDropDown.value);

  let operatingSystemDropDown = document.getElementById('operatingSystemDropDown');
  selectedOperatingSystem     = operatingSystemDropDown.value;

  let libcTypeDropDown        = document.getElementById('libcTypeDropDown');
  selectedLibcType            = libcTypeDropDown.value;

  let architectureDropDown    = document.getElementById('architectureDropDown');
  selectedArchitecture        = architectureDropDown.value;
  
  let archiveTypeDropDown     = document.getElementById('archiveTypeDropDown');
  selectedArchiveType         = archiveTypeDropDown.value;
  
  let selection;
  if (selectedMajorVersion.early_access_only) {
    selection = selectedPkgs.filter(function(pkg) {
      return pkg.distribution     == selectedDistribution &&
             pkg.java_version     == selectedVersionNumber &&
             pkg.operating_system == selectedOperatingSystem &&
             pkg.lib_c_type       == selectedLibcType &&
             pkg.architecture     == selectedArchitecture &&
             pkg.archive_type     == selectedArchiveType &&
             pkg.javafx_bundled   == javafxBundled;
    });
  } else {
    selection = selectedPkgs.filter(function(pkg) {
      return pkg.distribution                       == selectedDistribution &&
             normalizeJavaVersion(pkg.java_version) == selectedVersionNumber &&
             pkg.operating_system                   == selectedOperatingSystem &&
             pkg.lib_c_type                         == selectedLibcType &&
             pkg.architecture                       == selectedArchitecture &&
             pkg.archive_type                       == selectedArchiveType &&
             pkg.javafx_bundled                     == javafxBundled;
    });
  }
  
  if (selection.length > 0) {
    selectedPkg = selection[0];
    let filenameLabel = document.getElementById('filenameLabel');
    filenameLabel.innerHTML = selectedPkg.filename;
    let downloadButton = document.getElementById('downloadButton');
    downloadButton.disabled = false;
  } else {
    selectedPkg = null;
    let filenameLabel = document.getElementById('filenameLabel');
    filenameLabel.innerHTML = '-';
    let downloadButton = document.getElementById('downloadButton');
    downloadButton.disabled = true;
  }
}

function download() {
    if (selectedPkg == null || selectedPkg == undefined) { return; }
    getDownloadLink(selectedPkg.id, selectedPkg.directly_downloadable).then(
    function(uri) {
      // Success
      if (uri == null || uri == undefined) { return; }
      window.open(uri);
    },
    function() {
      // Failure
      console.log("Error")
      selectedPkg = null;
      let filenameLabel = document.getElementById('filenameLabel');
      filenameLabel.innerHTML = '-';
    }
  );
}

async function getMaintainedMajorVersions() {
  const url            = baseUrl + '/disco/v2.0/major_versions?ea=true&ga=true&maintained=true&include_build=true';
  let   major_versions = await makeRequest("GET", url);
  return major_versions;
}

async function getVersionsForMajorVersion(majorVersion, include_ea) {
  const url            = baseUrl + '/disco/v2.0/major_versions?ea=true&ga=true&maintained=true&include_build=true';
  let   major_versions = await makeRequest("GET", url);
  return major_versions;
}

async function getPkgsWithFxForMajorVersion(majorVersion) {
  let major_version = majorVersion.major_version;
  let include_build = majorVersion.early_access_only;
  const url      = baseUrl + '/disco/v2.0/packages?distro=zulu&distro=liberica&distro=corretto&version=' + major_version + '..%3C' + (major_version + 1) + '&release_status=' + (include_build ? 'ea' : 'ga') + '&directly_downloadable=true&discovery_socpe_id=public&discovery_scope_id=directly_downloadable&discovery_scope_id=build_of_openjdk&match=any';
  let   json     = await makeRequest("GET", url);
  const response = JSON.parse(json);
  const pkgs     = response.result;
  return pkgs;
}


// ******************** Common ***********************************************
function getOperatingSystem() {
  if (navigator.appVersion.indexOf("Win") != -1)   return "Windows";
  if (navigator.appVersion.indexOf("Mac") != -1)   return "MacOS";
  if (navigator.appVersion.indexOf("Linux") != -1) return "Linux";
  if (navigator.appVersion.indexOf("X11") != -1)   return "Unix";
  return "unknown";
}

function removeDropdownEntries(dropdown) {
  while(dropdown.firstChild) {
    dropdown.removeChild(dropdown.firstChild);
  }
}

function uniqueOnly(value, index, self) { return self.indexOf(value) === index; }

function capitalize(text) { return text.charAt(0).toUpperCase() + text.slice(1); }

async function getDownloadLink(id, directly_downloadable) {
  // Get current ephemeralId
  const packagesUrl = baseUrl + '/disco/v2.0/packages/' + id + '?' + scope;
  const packageJson  = await makeRequest("GET", packagesUrl);
  let   responseData = JSON.parse(packageJson);
  const pkg          = responseData.result[0];
  const ephemeralId  = pkg.ephemeral_id;

  // Get download link using the current ephemeralId
  const ephemeralIdsUrl = baseUrl + '/disco/v2.0/ephemeral_ids/' + ephemeralId;
  const packageInfoJson = await makeRequest("GET", ephemeralIdsUrl);
  responseData = JSON.parse(packageInfoJson);
  const packageInfo = responseData.result[0];
  return directly_downloadable ? packageInfo.direct_download_uri : packageInfo.download_site_uri;
}

async function getMajorVersion(which, include_ea) {
  const url           = baseUrl + '/disco/v2.0/major_versions/' + which + (include_ea ? '/ea' : '');
  let   major_version = await makeRequest("GET", url);
  return major_version;
}

async function getPackages(url) {
  let response = await makeRequest("GET", url);
  return response;
}

function makeRequest(method, url) {
  return new Promise(function (resolve, reject) {
    let request = new XMLHttpRequest();
    request.open(method, url);
    request.setRequestHeader('Disco-User-Info', 'DiscoWeb');
    request.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(request.response);
      } else {
        reject({
          status    : this.status,
          statusText: request.statusText
        });
      }
    };
    request.onerror = function () {
      reject({
        status    : this.status,
        statusText: request.statusText
      });
    };
    request.send();
  });
}

function normalizeJavaVersion(javaVersion) {
  let version = javaVersion
  if (version.indexOf('+') > -1) {
    version = version.substring(0, version.indexOf('+'));
    if (version.indexOf('-ea') > -1) {
      version = version.substring(0, version.indexOf('-ea'));
    }
  } else if (version.indexOf('-ea') > -1) {
    version = version.substring(0, version.indexOf('-ea'));
  }
  return version;
}

function getDistributionFromText(text) {
  if (null == text || text === undefined) { return ''; }
  switch (text) {
    case "zulu":
    case "ZULU":
    case "Zulu":
      return 'zulu';
    case "aoj":
    case "AOJ":
      return 'aoj';
    case "aoj_openj9":
    case "AOJ_OpenJ9":
    case "AOJ_OPENJ9":
    case "AOJ OpenJ9":
    case "AOJ OPENJ9":
    case "aoj openj9":
      return 'aoj_openj9';
    case "corretto":
    case "CORRETTO":
    case "Corretto":
      return 'corretto';
    case "dragonwell":
    case "DRAGONWELL":
    case "Dragonwell":
      return 'dragonwell';
    case "graalvm_ce8":
    case "graalvmce8":
    case "GraalVM CE 8":
    case "GraalVMCE8":
    case "GraalVM_CE8":
    return 'graalvm_ce8';
    case "graalvm_ce11":
    case "graalvmce11":
    case "GraalVM CE 11":
    case "GraalVMCE11":
    case "GraalVM_CE11":
      return 'graalvm_ce11';
    case "graalvm_ce16":
    case "graalvmce16":
    case "GraalVM CE 16":
    case "GraalVMCE16":
    case "GraalVM_CE16":
      return 'graalvm_ce16';
    case "liberica":
    case "LIBERICA":
    case "Liberica":
      return 'liberica';
    case "liberica_native":
    case "LIBERICA_NATIVE":
    case "libericaNative":
    case "LibericaNative":
    case "liberica native":
    case "LIBERICA NATIVE":
    case "Liberica Native":
      return 'liberica_native';
    case "mandrel":
    case "MANDREL":
    case "Mandrel":
      return 'mandrel';
    case "microsoft":
    case "Microsoft":
    case "MICROSOFT":
    case "Microsoft Build of OpenJDK":
      return 'microsoft';
    case "ojdk_build":
    case "OJDK_BUILD":
    case "OJDK Build":
    case "ojdk build":
    case "ojdkbuild":
    case "OJDKBuild":
      return 'ojdk_build';
    case "openlogic":
    case "OPENLOGIC":
    case "OpenLogic":
    case "open_logic":
    case "OPEN_LOGIC":
    case "Open Logic":
    case "OPEN LOGIC":
    case "open logic":
      return 'openlogic';
    case "oracle":
    case "Oracle":
    case "ORACLE":
      return 'oracle';
    case "oracle_open_jdk":
    case "ORACLE_OPEN_JDK":
    case "oracle_openjdk":
    case "ORACLE_OPENJDK":
    case "Oracle_OpenJDK":
    case "Oracle OpenJDK":
    case "oracle openjdk":
    case "ORACLE OPENJDK":
    case "open_jdk":
    case "openjdk":
    case "OpenJDK":
    case "Open JDK":
    case "OPEN_JDK":
    case "open-jdk":
    case "OPEN-JDK":
    case "Oracle-OpenJDK":
    case "oracle-openjdk":
    case "ORACLE-OPENJDK":
    case "oracle-open-jdk":
    case "ORACLE-OPEN-JDK":
      return 'oracle_open_jdk';
    case "RedHat":
    case "redhat":
    case "REDHAT":
    case "Red Hat":
    case "red hat":
    case "RED HAT":
    case "Red_Hat":
    case "red_hat":
    case "red-hat":
    case "Red-Hat":
    case "RED-HAT":
      return 'redhat';
    case "sap_machine":
    case "sapmachine":
    case "SAPMACHINE":
    case "SAP_MACHINE":
    case "SAPMachine":
    case "SAP Machine":
    case "sap-machine":
    case "SAP-Machine":
    case "SAP-MACHINE":
      return 'sap_machine';
    case "temurin":
    case "Temurin":
    case "TEMURIN":
      return 'temurin';
    case "trava":
    case "TRAVA":
    case "Trava":
    case "trava_openjdk":
    case "TRAVA_OPENJDK":
    case "trava openjdk":
    case "TRAVA OPENJDK":
      return 'trava';
    default:
      return '';
  }
}
