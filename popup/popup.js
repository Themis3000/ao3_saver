if (typeof browser === "undefined") {
  var browser = chrome;
}

const works = document.getElementById("works");
const search = document.getElementById("search");
const home = document.getElementById("home");
const settings = document.getElementById("settings");
let worksData = [];


browser.storage.local.get(null, results => {
  for (const key in results) {
    if (key.startsWith("work_")) {
      worksData.push(results[key]);
    }
  }
  listItems(worksData);
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
  downloadA.href = `https://ao3.themimegas.com/works/${item['id']}`;
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
  for (item of items) {
    listItem(item);
  }
}

search.oninput = () => {
  const text = search.value;
  const textLower = text.toLowerCase();
  const filteredWorks = worksData.filter(work => {
    const title = work["title"].toLowerCase();
    const author = work["author"].toLowerCase();
    return title.includes(textLower) || author.includes(textLower);
  });
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

browser.storage.local.get("settings", results => {
  const settings = results["settings"];
  if (settings === undefined) {
    return;
  }
  delayInput.value = settings["timeDelay"].toString();
});

document.getElementById("saveSettings").onclick = () => {
  const timeDelay = parseInt(delayInput.value);
  if (5 > timeDelay) {
    delayInput.value = "5";
    return;
  }
  const objectStore = {"settings": {"timeDelay": parseInt(delayInput.value)}};
  browser.storage.local.set(objectStore);
};

document.getElementById("bulkDownloadButton").onclick = () => {
  const userAccept = confirm(`Warning: this will download ${worksData.length} works, are you sure you want to continue?`);

  if (!userAccept) {
    alert("Cancelled download");
    return;
  }

  const worksReq = worksData.map((workData) => {
    return {work_id: workData.id, title: workData.title};
  });
  const requestJson = JSON.stringify({works: worksReq});

  fetch(`https://ao3.themimegas.com/works/dl/bulk_prepare`, {
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
    const download_url = `https://ao3.themimegas.com/works/dl/bulk_dl/${download_id}`;
    window.open(download_url, '_blank');
  });
};
