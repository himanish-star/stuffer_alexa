const startSearch = require('searchingItem').startSearch;
const activeSearch = require('activeListSearching').activeSearch;
let activeList = [];// this list will contain a maximum of 10 things which would be maintained as a FIFO list

const storeItem = (itemName, locationName) => {
  //1. First item is to be stored to the activeList
  //2. If the active List size is exceeded move to the database
  //3. More complexities will be put into as we progress
  
  /*use startSearch imported above to see whether it exists in list or not
    if same name object exists, re-prompt user in else condition for differentiating keyword
    now push
  */
  let activeListMember = {
    itemName,
    locationName
  };
  if(activeList.length === 10) {
    let poppedItem = activeList.shift();
    activeList.push(activeListMember);
    addMemberToMasterDB(poppedItem);
  } else {
    activeList.push(activeListMember);
  }
  storeActiveListToDB(activeList);
};

module.exports = {
  storeItem, activeList
};
