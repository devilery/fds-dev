const axios = require("axios");

async function getInstallationRepos(token) {
  let data = await fetchPage();

  async function fetchPage(nextPage) {
    let url = nextPage
      ? nextPage
      : "https://api.github.com/installation/repositories";
    let response = await axios.get(url, {
      params: { per_page: 100 },
      headers: {
        Accept: "application/vnd.github.machine-man-preview+json",
        Authorization: `token ${token}`
      }
    });
    const linkHeader = response.headers.link;
    const parsedHeader = parseLinkHeader(linkHeader);
    let nextPageData = [];
    if (parsedHeader.next) {
      nextPageData = await fetchPage(parsedHeader.next);
    }
    const pageData = response.data.repositories;
    return pageData.concat(nextPageData);
  }

  return data;
}

function parseLinkHeader(data) {
  let arrData = data.split("link:");
  data = arrData.length === 2 ? arrData[1] : data;
  let parsed_data = {};

  arrData = data.split(",");

  for (let d of arrData) {
    let linkInfo = /<([^>]+)>;\s+rel="([^"]+)"/gi.exec(d);

    parsed_data[linkInfo[2]] = linkInfo[1];
  }

  return parsed_data;
}

(async function() {
  let repos = await getInstallationRepos("v1.47c2064216185a858508143af20c1447ffd3ff2f");

  console.log(repos.length);
})()


