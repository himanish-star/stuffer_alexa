const startSearch = require('searchingItem').startSearch;
const activeList = [];

/*
* @param itemName
* @param locationName
*/
const storeItem = (itemName, LocationName) => {
  //how do we start writing this code ??
  
  /*if(/!*use searching imported above to see whether it exists in list or not
       if same name object exists, remprompt user in else condition for differentiating keyword
       now push
     *!/ )*/
  activeList.push(itemName, LocationName);
  //fix some interval after which we update the masterDB, or maybe when we remove an ITEM then.
  addToMasterDB(itemName, LocationName)
};

module.exports = {
  storeItem, activeList
};
