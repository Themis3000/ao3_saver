if (typeof browser === "undefined") {
  var browser = chrome;
}

const works = document.getElementById("works");
const search = document.getElementById("search");
let worksData = [];


browser.storage.local.get(null, results => {
  worksData = Object.keys(results).map(key => results[key]);
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
