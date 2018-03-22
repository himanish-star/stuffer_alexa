const activeList = require('storingItem').activeList;

/*
* @param itemName
*/
const startSearch = (itemName) => {
  //perform searches in active list then in the dynamoDB
  //step by step
  //1. Direct Match in Active List imported above
  //2. Searching of 5 synonyms in activeList
  //3. check Up if if itemName exists in masterDB -> give out probable places
  //4. check up if confirmed synonym exists in masterDB or not
  //5. Scope for recursive searches
  //6. Send a not found flag now
};


module.exports = {
  startSearch
};
