const activeList = require('storingItem').activeList;

/*
* @param itemName
*/
const startSearch = (itemName,  originalList) => {
  return originalList[0].locationName;
};


module.exports = {
  startSearch
};
