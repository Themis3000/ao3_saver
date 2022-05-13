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
  const accessedDate = new Date(item["accessed"]);
  rightContainer.innerText = accessedDate.toLocaleDateString();
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
