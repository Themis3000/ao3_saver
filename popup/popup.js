if (typeof browser === "undefined") {
  var browser = chrome;
}

const works = document.getElementById("works");
const search = document.getElementById("search");
const home = document.getElementById("home");
const settings = document.getElementById("settings");
let worksData = [];
let indexWorksData = [];
let serverAddress;


browser.storage.local.get("settings", results => {
  let settings = results["settings"];
  if (settings === undefined) {
    return;
  }
  delayInput.value = settings["timeDelay"].toString();
  displayLimitInput.value = settings["displayLimit"].toString();
  serverAddressInput.value = settings["serverAddress"];
  serverAddress = settings["serverAddress"];
  disableLimit.checked = settings["disableLimit"];

  browser.storage.local.get("recentsIndex", async results => {
    const index = results["recentsIndex"];
    for (const item of index) {
      const workDataResults = await browser.storage.local.get(item);
      const workData = workDataResults[item];
      indexWorksData.push(workData);
      if (indexWorksData.length >= settings["displayLimit"])
        break;
    }
    listItems(indexWorksData);
  });
});

function listItem(item) {
  const container = document.createElement("a");
  container.className = "work";
  container.href = `https://archiveofourown.org/works/${item['id']}`;
  container.target = "_blank";
  const leftContainer = document.createElement("div");
  const title = document.createElement("span");
  title.className = "title";
  title.innerText = item["title"];
  const author = document.createElement("i");
  author.innerText = item["author"];
  leftContainer.appendChild(title);
  leftContainer.appendChild(document.createElement("br"));
  leftContainer.appendChild(author);
  const rightContainer = document.createElement("div");
  rightContainer.className = "rightContainer";
  const rightText = document.createElement("span");
  const downloadA = document.createElement("a");
  const downloadImg = document.createElement("img");
  downloadImg.src = "../images/download.svg";
  downloadImg.className = "downloadIcon";
  downloadA.href = `${serverAddress}/works/${item['id']}`;
  downloadA.target = "_blank";
  downloadA.appendChild(downloadImg);
  rightContainer.appendChild(downloadA);
  const accessedDate = new Date(item["accessed"]);
  rightText.innerText = accessedDate.toLocaleDateString();
  rightContainer.appendChild(rightText);
  container.appendChild(leftContainer);
  container.appendChild(rightContainer);
  works.appendChild(container);
}

function listItems(items) {
  works.innerHTML = "";
  items.sort((a, b) => b["accessed"] - a["accessed"]);
  for (const item of items) {
    console.log(item);
    listItem(item);
  }
}

search.oninput = async () => {
  const text = search.value;
  if (2 >= text.length) {
    listItems(indexWorksData);
    return;
  }
  await fetchAllWorks();
  const textLower = text.toLowerCase();
  let filteredWorks = worksData.filter(work => {
    const title = work["title"].toLowerCase();
    const author = work["author"].toLowerCase();
    return title.includes(textLower) || author.includes(textLower);
  });
  if (filteredWorks.length !== 0)
    filteredWorks.splice(0, settings['displayLimit']);
  listItems(filteredWorks);
}

//settings code
document.getElementById("settingsGear").onclick = () => {
  home.style.display = "none";
  settings.style.display = "block";
};

document.getElementById("backArrow").onclick = () => {
  settings.style.display = "none";
  home.style.display = "block";
};

const delayInput = document.getElementById("timeDelay");
const displayLimitInput = document.getElementById("displayLimit");
const serverAddressInput = document.getElementById("serverAddress");
const disableLimit = document.getElementById("disableLimit");

document.getElementById("saveSettings").onclick = async () => {
  const timeDelay = parseInt(delayInput.value);
  if (5 > timeDelay) {
    delayInput.value = "5";
    return;
  }
  const displayLimit = parseInt(displayLimitInput.value);
  if (1 > displayLimit || displayLimit > 200) {
    displayLimitInput.value = "100";
    return;
  }
  const serverAddress = serverAddressInput.value;
  if (serverAddress.length < 7) {
    serverAddress.value = "http://127.0.0.1:8000";
    return;
  }

  const settings_query = await browser.storage.local.get("settings");
  const settings = settings_query["settings"];

  settings["timeDelay"] = parseInt(delayInput.value);
  settings["displayLimit"] = parseInt(displayLimitInput.value);
  settings["serverAddress"] = serverAddressInput.value;
  settings["disableLimit"] = disableLimit.checked;

  const objectStore = {"settings": settings};
  browser.storage.local.set(objectStore);
};

document.getElementById("bulkDownloadButton").onclick = async () => {
  await fetchAllWorks();
  const userAccept = confirm(`Warning: this will download ${worksData.length} works, are you sure you want to continue?`);

  if (!userAccept) {
    alert("Cancelled download");
    return;
  }

  const worksReq = worksData.map((workData) => {
    return {work_id: workData.id, title: workData.title};
  });
  const requestJson = JSON.stringify({works: worksReq});

  fetch(`${serverAddress}/works/dl/bulk_prepare`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: requestJson
  }).then(async response => {
    if (!response.ok) {
      console.log(response);
      alert("Error downloading works!");
      return;
    }
    const response_data = await response.json();
    const download_id = response_data["dl_id"];
    const download_url = `${serverAddress}/works/dl/bulk_dl/${download_id}`;
    window.open(download_url, '_blank');
  });
};

async function fetchAllWorks() {
  if (worksData.length !== 0)
    return;
  const results = await browser.storage.local.get(null);
  for (const key in results) {
    if (key.startsWith("work_"))
      worksData.push(results[key]);
  }
}
