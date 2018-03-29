'use strict';

const Alexa = require('alexa-sdk');
const awsSDK = require('aws-sdk');
const thesaurus = require('thesaurus-com');

const itemsTableName = 'Items';
const timeStampTableName = 'TimeStamp';
const activeListTableName = 'ActiveList';

const documentClient = new awsSDK.DynamoDB.DocumentClient();

let activeListFetchedStatus = false;

//this activeList is filled up at the beginning of the program and emptied at the exit of the program
let activeList = [];

//function to fetch activeList at the beginning of the start of Alexa
function fetchActiveListAndCache(userId) {
  const params = {
    TableName: activeListTableName,
    Key: {
      "userId": userId
    }
  };
  documentClient.get(params, function (err, data) {
    if(err) {
      console.log("oops! activeList couldn't be fetched", err);
    } else {
      console.log('activeList has been cached');
      activeListFetchedStatus = true;
      if(data.Item) activeList = data.Item.activeList;
    }
  })
}

//stores the activeList back into the ActiveList table after the program comes to a halt
function storeActiveList(userId) {
  const params = {
    TableName: activeListTableName,
    Item: {
      "userId": userId,
      "activeList": activeList
    }
  };
  documentClient.put(params, function (err, data) {
    if(err) {
      console.log("activeList couldn't be stored");
    } else {
      console.log("activeList has been stored", data);
    }
  })
}

//moves all old items to masterDB
function moveFromActiveListToDB(userId, transferList) {
  
  transferList.forEach(function (item) {
    const params = {
      TableName: itemsTableName,
      Item:{
        "itemName-userId": item.itemName + "-" + userId,
        "userId": userId,
        "itemName": item.itemName,
        "locationName": item.locationName
      }
    };
  
    documentClient.put(params, function(err, data) {
      if (err) {
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("Added item to the database:", JSON.stringify(data, null, 2));
      }
    });
  })
}

const handlers = {
  
  //After every findItemIntent remove element from activeList.
  
  'FindItemIntent': function () {
    let emitCopy = this.emit;
    const { userId } = this.event.session.user;
    const { slots } = this.event.request.intent;
  
    if(!activeListFetchedStatus) {
      fetchActiveListAndCache(userId);
      fetchExistingTimeStamp(userId);
    }
  
    //name of the item
    if (!slots.Item.value) {
      const slotToElicit = 'Item';
      const speechOutput = 'What is the item to be found?';
      const repromptSpeech = 'Please tell me the name of the item to be found';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    } else if (slots.Item.confirmationStatus !== 'CONFIRMED') {
      if (slots.Item.confirmationStatus !== 'DENIED') {
        // slot status: unconfirmed
        const slotToConfirm = 'Item';
        const speechOutput = `The name of the item is ${slots.Item.value}, correct?`;
        const repromptSpeech = speechOutput;
        return this.emit(':confirmSlot', slotToConfirm, speechOutput, repromptSpeech);
      }
      
      const slotToElicit = 'Item';
      const speechOutput = 'What is the item you would like to find?';
      const repromptSpeech = 'Please tell me the name of the item to be found';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }
    
    const itemName = slots.ItemName.value;
    let searchFlag = false;
    let requiredSynonyms = [];
    
    //search in activeList with itemName
    for (let activeMember in activeList) {
      if(activeMember[itemName]) {
        emitCopy(":tell", `your ${itemName} is located at ${activeMember[itemName]}`);
        searchFlag = true;
        let index = activeList.indexOf(itemName);
        if (index > -1) activeList.splice(index, 1);
        break;
      }
    }
    //search in activeList with synonym
    if(!searchFlag) {
      console.log('Attempting to read data of synonyms in activeList');
      const synonyms = thesaurus.search(itemName).synonyms;
      //todo: filter out required synonyms
      // requiredSynonyms = filterSynonyms(synonyms);
      // requiredSynonyms.forEach(function (synonym) {
      synonyms.forEach(function (synonym) {
        
        for (let activeMember in activeList) {
          if(activeMember[synonym]) {
            //todo: user has to confirm that this is what he requires, setup dialog model
            requiredSynonyms.push(synonym);
            emitCopy(":tell", `your ${synonym} is located at ${activeMember[synonym]}`);
            searchFlag = true;
            
            let index = activeList.indexOf(synonym);
            if (index > -1) activeList.splice(index, 1);
            break;
          }
        }
      });
    }
    
    //search in Items table using ItemName
    if(!searchFlag) {
      console.log('Attempting to read data in Items table');
      let params = {
        TableName: itemsTableName,
        Key:{
          "itemName-userId": slots.Item.value + "-" + userId
        }
      };
      documentClient.get(params, function(err, data) {
        if (err) {
          console.error("Unable to find item. Error JSON:", JSON.stringify(err, null, 2));
          emitCopy(':tell', `oops! something went wrong`);
        } else {
          console.log("Found item:", JSON.stringify(data, null, 2));
          if(data.Item) {
            emitCopy(":tell", `you can find your ${data.Item.itemName} at ${data.Item.locationName}`)
          } else {
            //search in Items table on the basis of synonym
            console.log('Attempting to read data of synonyms in Items table');
            requiredSynonyms.forEach(function (synonym) {
              params.Key = {
                "itemName-userId": synonym + "-" + userId
              };
              documentClient.get(params, function(err, data) {
                if(err) {
                  console.error("Unable to find item. Error JSON:", JSON.stringify(err, null, 2));
                  emitCopy(':tell', `oops! something went wrong`);
                } else {
                  if(data.Item) {
                    emitCopy(":tell", `you can find your ${data.Item.itemName} at ${data.Item.locationName}`)
                  } else {
                    //todo: now check history @shikhar and @prakriti
                  }
                }
              });
            });
            
          }
        }
      });
    }
    
  },
  
  'StoreItemIntent': function () {
    
    const { userId } = this.event.session.user;
    const { slots } = this.event.request.intent;
  
    if(!activeListFetchedStatus) {
      fetchActiveListAndCache(userId);
      fetchExistingTimeStamp(userId);
    }
    
    // name of the item
    if (!slots.Item.value) {
      const slotToElicit = 'Item';
      const speechOutput = 'What is the item to be stored?';
      const repromptSpeech = 'Please tell me the name of the item';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    } else if (slots.Item.confirmationStatus !== 'CONFIRMED') {
      if (slots.Item.confirmationStatus !== 'DENIED') {
        // slot status: unconfirmed
        const slotToConfirm = 'Item';
        const speechOutput = `The name of the item is ${slots.Item.value}, correct?`;
        const repromptSpeech = speechOutput;
        return this.emit(':confirmSlot', slotToConfirm, speechOutput, repromptSpeech);
      }
      
      const slotToElicit = 'Item';
      const speechOutput = 'What is the item you would like to store?';
      const repromptSpeech = 'Please tell me the name of the item';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }
    
    //name of the place where the item is to be stored
    if (!slots.Place.value) {
      const slotToElicit = 'Place';
      const speechOutput = 'Where is the item stored?';
      const repromptSpeech = 'Please give me a location of the item.';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    } else if (slots.Place.confirmationStatus !== 'CONFIRMED') {
      if (slots.Place.confirmationStatus !== 'DENIED') {
        // slot status: unconfirmed
        const slotToConfirm = 'Place';
        const speechOutput = `The item location is ${slots.Place.value}, correct?`;
        const repromptSpeech = speechOutput;
        return this.emit(':confirmSlot', slotToConfirm, speechOutput, repromptSpeech);
      }
      
      // slot status: denied -> reprompt for slot data
      const slotToElicit = 'Place';
      const speechOutput = 'Where can the item be found?';
      const repromptSpeech = 'Please give me a location where the item is stored.';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }
    
    activeList.push({
      itemName: slots.Item.value,
      locationName: slots.Place.value,
      whetherTransferred: false
    });
  
    
    this.emit(":tell", `your ${slots.Item.value} has been stored at ${slots.Place.value}`)
  },
  
  'AMAZON.CancelIntent': function () {
    const { userId } = this.event.session.user;
    storeActiveList(userId);
    this.emit(':tell', 'Goodbye!');
  },
  
  'AMAZON.StopIntent': function () {
    const { userId } = this.event.session.user;
    storeActiveList(userId);
    this.emit(':tell', 'Goodbye!');
  },
  
  'LaunchRequest':  function () {
    //todo: ask Shikhar or Prakriti to design this
    // Prakriti had already used this in one of her PR's
  }
  
};

//gets old timestamp and then updates DB if needed
function fetchExistingTimeStamp(userId) {
  const timeStampParams = {
    TableName: timeStampTableName,
    Key: {
      "userId": userId
    }
  };
  documentClient.get(timeStampParams, function (err, data) {
    if (err) {
      console.error("Time stamp not working", JSON.stringify(err, null, 2));
      checkRenew(false, userId);
    } else {
      console.log("Time Stamp found:", JSON.stringify(data, null, 2));
      checkRenew(data, userId);
    }
  });
}

//updates db after checking time
function checkRenew(data, userId) {
  const date = new Date();
  const currentTimeStamp = date.getTime();
  if(!data.Item) {
    let params = {
      TableName: timeStampTableName,
      Item:{
        "userId": userId,
        "timestamp": currentTimeStamp
      }
    };
    
    documentClient.put(params, function(err, data) {
      if (err) {
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("Added item:", JSON.stringify(data, null, 2));
      }
    });
  } else {
    if(currentTimeStamp - data.Item.timestamp >= 259200000) {
      let params = {
        TableName: timeStampTableName,
        Item:{
          "userId": userId,
          "timestamp": currentTimeStamp
        }
      };
      documentClient.put(params, function(err, data) {
        if (err) {
          console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
          console.log("Added item:", JSON.stringify(data, null, 2));
          const transferList = activeList.filter(elem => !elem.whetherTransferred);
          activeList.forEach(function (elem) {
            elem.whetherTransferred = true;
          })
          moveFromActiveListToDB(userId, transferList)
        }
      });
    }
  }
}

exports.handler = function (event, context, callback) {
  const alexa = Alexa.handler(event, context, callback);
  alexa.registerHandlers(handlers);
  alexa.execute();
};
