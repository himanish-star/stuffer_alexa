'use strict';

const Alexa = require('alexa-sdk');
const awsSDK = require('aws-sdk');

// Tables
const itemsTableName = 'Items';
const timeStampTableName = 'TimeStamp';
const activeListTableName = 'ActiveList';
const historyTableName = 'HistoryOfItems';
const eventsTableName = 'Events';

const documentClient = new awsSDK.DynamoDB.DocumentClient();

let activeListFetchedStatus = false;

//this activeList is filled up at the beginning of the program
let activeList = [];

// handles all Intents
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

    const itemName = slots.Item.value;
    let searchFlag = false;
    let itemLocation = '';

    //search in activeList with itemName
    for (let activeMember of activeList) {
      if(activeMember.itemName === itemName) {
        emitCopy(":tell", `your ${itemName} is located at ${activeMember.locationName}`);
        searchFlag = true;
        itemLocation = activeMember.locationName;
    
        const index = activeList.indexOf(activeMember);
        activeList.splice(index, 1);
        storeActiveList(userId);
        updateHistoryOfItem(userId, itemName, itemLocation);
        break;
      }
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
            searchFlag = true;
            itemLocation = data.Item.locationName;
            emitCopy(":tell", `you can find your ${data.Item.itemName} at ${data.Item.locationName}`)
  
            //deleting found item form itemsTable. Updation in historyTable Takes place below
            let params = {
              TableName: itemsTableName,
              Key:{
                "itemName-userId": slots.Item.value + "-" + userId
              }
            };
            
            documentClient.delete(params, function (err, data) {
              if (err) {
                console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
              } else {
                console.log(`Deleted Item`, JSON.stringify(data, null, 2));
                updateHistoryOfItem(userId, itemName, itemLocation);
              }
            })
            
          } else {
            const getParams = {
              TableName: historyTableName,
              Key: {
                "itemName-userId": `${itemName}-${userId}`
              }
            };
            documentClient.get(getParams, function (err, data) {
              if(err) {
                console.log('error, nothing found');
              } else {
                if(data.Item) {
                  emitCopy(":tell", `you may find your item inside the ${data.Item.historyArray.join(", ")}`)
                } else {
                  emitCopy(":tell", "nothing found")
                }
              }
            })
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
      locationName: slots.Place.value
    });

    storeActiveList(userId);
    this.emit(":tell", `your ${slots.Item.value} has been stored at ${slots.Place.value}`)
  },

  'StoreEventItemIntent': function () {
    let emitOO = this.emit;
    const { userId } = this.event.session.user;
    let event_key = this.event.request.intent.slots.Event_key.value;
    let event_name = this.event.request.intent.slots.Event.value;
    let start = this.event.request.intent.slots.Start.value;
    let itemName = this.event.request.intent.slots.Item.value;
    let itemTwo = this.event.request.intent.slots.Itemtwo.value;
    let itemThree = this.event.request.intent.slots.Itemthree.value;
    let itemFour = this.event.request.intent.slots.Itemfour.value;
    let itemFive = this.event.request.intent.slots.Itemfive.value;
    let stop = this.event.request.intent.slots.Stop.value;

    let params = {
      TableName: eventsTableName,
      Item:{
        "userId-eventName": userId+ "-"+event_name,
        "eventName":event_name,
        "itemName": itemName,
        "itemTwoName": itemTwo,
        "itemThreeName": itemThree,
        "itemFourName": itemFour,
        "itemFiveName": itemFive
      }
    };

    documentClient.put(params, function(err, data) {
      if (err) {
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("Added item:", JSON.stringify(data, null, 2));
        emitOO(':tell', "success");
      }
    });
  },

  'FindEventItemIntent': function () {
    let emitCopy = this.emit;
    const { userId } = this.event.session.user;
    const { slots } = this.event.request.intent;

    //name of the item
    if (!slots.Event.value) {
      const slotToElicit = 'Event';
      const speechOutput = 'What is the name of the event';
      const repromptSpeech = 'Please tell me the name of the event';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    } else if (slots.Event.confirmationStatus !== 'CONFIRMED') {
      if (slots.Event.confirmationStatus !== 'DENIED') {
        // slot status: unconfirmed
        const slotToConfirm = 'Event';
        const speechOutput = `The name of the event is ${slots.Event.value}, correct?`;
        const repromptSpeech = speechOutput;
        return this.emit(':confirmSlot', slotToConfirm, speechOutput, repromptSpeech);
      }

      const slotToElicit = 'Event';
      const speechOutput = 'What is the name of the event?';
      const repromptSpeech = 'Please tell me the name of the event';
      return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
    }

    console.log('Attempting to read data in Events table');
    let params = {
      TableName: eventsTableName,
      Key:{
        "userId-eventName": userId+ "-"+slots.Event.value
      }
    };
    documentClient.get(params, function(err, data) {
      if (err) {
        console.error("Unable to find item. Error JSON:", JSON.stringify(err, null, 2));
        emitCopy(':tell', `oops! something went wrong`);
      } else {
        console.log("Found item:", JSON.stringify(data, null, 2));
        if(data.Item.itemName) {
          if(data.Item.itemTwoName) {
            if(data.Item.itemThreeName) {
              if(data.Item.itemFourName) {
                if(data.Item.itemFiveName) {
                  emitCopy(":tell", `For ${data.Item.eventName} you require ${data.Item.itemName},
                  ${data.Item.itemTwoName}, ${data.Item.itemThreeName}, ${data.Item.itemFourName},
                  ${data.Item.itemFiveName}`);
                }
                emitCopy(":tell", `For ${data.Item.eventName} you require ${data.Item.itemName},
                ${data.Item.itemTwoName}, ${data.Item.itemThreeName}, ${data.Item.itemFourName}`);
              }
              emitCopy(":tell", `For ${data.Item.eventName} you require ${data.Item.itemName},
              ${data.Item.itemTwoName}, ${data.Item.itemThreeName}`);
            }
            emitCopy(":tell", `For ${data.Item.eventName} you require ${data.Item.itemName},
            ${data.Item.itemTwoName}`);
          }
          emitCopy(":tell", `For ${data.Item.eventName} you require ${data.Item.itemName}`);
        }
        emitCopy(":tell", `For ${data.Item.eventName} you do not require anything.`);
      }
    });
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
    this.emit(':ask', `Welcome to Stuffer <break strength="medium" />
                      The following commands are available: add an item, find an item,
                      add items for an event, find items for an event. What
                      would you like to do?`);
    //todo: ask Shikhar or Prakriti to design this
    // Prakriti had already used this in one of her PR's
  }

};

//function to update history
function updateHistoryOfItem(userId, itemName, itemLocation) {
  let historyArrayOfItem = [];
  const readParams = {
    TableName: historyTableName,
    Key: {
      "itemName-userId": `${itemName}-${userId}`
    }
  };
  
  documentClient.get(readParams, function (err, data) {
    if (err) {
      console.log('error, the history array of the item couldn\'t be fetched');
    } else {
      if(data.Item) {
        historyArrayOfItem = data.Item.historyArray;
        if(!historyArrayOfItem.includes(itemLocation)) {
          historyArrayOfItem.push(itemLocation);
          if(historyArrayOfItem.length > 5) {
            historyArrayOfItem.shift();
          }
        }
      } else {
        historyArrayOfItem.push(itemLocation);
      }
      const writeParams = {
        TableName: historyTableName,
        Item: {
          "itemName-userId": `${itemName}-${userId}`,
          "historyArray": historyArrayOfItem
        }
      };
      documentClient.put(writeParams, function (err, data) {
        if(err) {
          console.log('error, the history array of the item couldn\'t be updated');
        } else {
          console.log('this history of the Item has been updated', data);
        }
      })
    }
  })
}

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
function localALtoDBAL(userId, transferList) {
  
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
         
          // transfers local Active list items to larger ActiveList existing in DB. i.e. Items Table after every 3 days
          // empties the local ActiveList afterwards.
          localALtoDBAL(userId, activeList)
          activeList = []
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
