const url = document.URL;
const urlArr = url.split("/");

if (is404()) {
  insertFindButtons();
} else if (isWork()) {
  setTimeout(archiveIfNotSaved, 5000);
} else {
  console.log("This page does not contain a work");
}

if (typeof browser === "undefined") {
  var browser = chrome;
}

function archiveIfNotSaved() {
  const workId = getWorkId();
  const updated = getUpdated();
  browser.storage.local.get(workId, result => {
    const storedUpdate = result[workId];
    //check if current version of work has been archived already
    if (storedUpdate !== updated) {
      archive(workId, updated);
    } else {
      console.log("Stored date was equal to the last updated date: did not archive.")
    }
  });
}

function archive(workId, updated) {
  console.log("archiving...");

  const requestJson = JSON.stringify({work_id: workId, updated_time: updated});

  //Report the work to the backend
  fetch(`https://ao3.themimegas.com/report_work`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: requestJson
  }).then(() => {
    //Record that the work has been archived
    const objectStore = {};
    objectStore[workId] = updated;
    browser.storage.local.set(objectStore);
  });
}

function insertFindButtons() {
  const workId = getWorkId();
  const main = document.querySelector("#main");
  const container = document.createElement("div");
  const ao3Saver = createButton("Check on ao3 saver", `https://ao3.themimegas.com/works/${workId}`);
  const archivePdf = createButton("Check for pdf on archive.org", `https://web.archive.org/web/*/https://archiveofourown.org/downloads/${workId}/*`);
  const archive = createButton("Check on archive.org", `https://web.archive.org/web/*/https://archiveofourown.org/works/${workId}/*`);
  container.appendChild(ao3Saver);
  container.appendChild(archivePdf);
  container.appendChild(archive);
  main.appendChild(container);
}

function createButton(text, url) {
  const button = document.createElement("input");
  button.value = text;
  button.class = "button";
  button.type = "submit";
  button.onclick = () => window.open(url, "_blank");
  return button;
}

function getWorkId() {
  return parseInt(urlArr[4]).toString();
}

function getUpdated() {
  const dateStr = document.querySelector("dd.status").textContent;
  return Date.parse(dateStr);
}

function is404() {
  return document.querySelector(".error-404") !== null;
}

function isWork() {
  return urlArr.length >= 5;
}
