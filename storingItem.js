const startSearch = require('searchingItem').startSearch;
const activeList = [];

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
  //how do we start writing this code ??
  
  if(/*use searching imported above to see whether it exists in list or not
       if same name object exists, remprompt user in else condition for differentiating keyword
       now push
     */ )
  activeList.push(itemName, locationName);
  //fix some interval after which we update the masterDB, or maybe when we remove an ITEM then.
  addToMasterDB(itemName, locationName)
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
