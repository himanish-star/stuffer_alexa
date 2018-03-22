const startSearch = require('searchingItem').startSearch;
const activeSearch = require('activeListSearching').activeSearch;
let activeList = [];// this list will contain a maximum of 10 things which would be maintained as a FIFO list

const AWS = require("aws-sdk");

const docClient = new AWS.DynamoDB.DocumentClient();


AWS.config.update({
  region: "us-west-2",
  endpoint: "http://localhost:8000"
});

const dynamodb = new AWS.DynamoDB();


//this needs to be defined just once, when the file is loaded for the veryfirst time.
const params = {
  TableName : "MasterList",
  KeySchema: [
    { AttributeName: "itemName", KeyType: "HASH"},  //Partition key
    { AttributeName: "placesOfStorage", KeyType: "RANGE" }  //Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "itemName", AttributeType: "S" },
    { AttributeName: "placesOfStorage", AttributeType: "S" }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  }
};

dynamodb.createTable(params, function(err, data) {
  if (err) {
    console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
  } else {
    console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
  }
});


/*
* @param itemName
* @param locationName
*/

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


function addToMasterDB (itemName, locationName) {
  const params = {
    TableName: "MasterList",
    Item: {
      "itemName": itemName,
      "placesOfStorage": locationName
      // "itemName": "\"" + itemName + "\"",
      // "placesOfStorage": "\"" + locationName + "\""
    }
  }
  
  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add ", itemName, ". Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("PutItem succeeded:", itemName);
    }
  });
}

module.exports = {
  storeItem, activeList
};
